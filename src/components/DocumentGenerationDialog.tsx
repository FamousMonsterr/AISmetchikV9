// @ts-nocheck
// src/components/DocumentGenerationDialog.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Download, Send, FileText, FileSpreadsheet, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, type HistoryRequest, type QuoteConfig, type Company, initialQuoteConfig } from '@/contexts/AppContext';
import { generateDocx } from '@/services/docxGenerator';
import { generateExcel, generateObjectSummaryExcel } from '@/services/excelGenerator';
import DocumentTemplate from '@/components/pdf/DocumentTemplate';
import GroupDocumentTemplate from '@/components/pdf/GroupDocumentTemplate';
import InvoiceTemplate from '@/components/pdf/InvoiceTemplate';
import ContractTemplate from '@/components/pdf/ContractTemplate';
import ActTemplate from '@/components/pdf/ActTemplate';
import Ks2Template from '@/components/pdf/Ks2Template';
import Ks3Template from '@/components/pdf/Ks3Template';
import Ks6aTemplate from '@/components/pdf/Ks6aTemplate';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { sendFileToTelegramUser } from '@/actions/telegramActions';
import { calculateProjectTotals } from '@/lib/calculation';
import { CompanyFormDialog } from './CompanyFormDialog';
import { addDoc, collection, serverTimestamp } from '@/lib/db-client';
import { db } from '@/lib/db';
import axios from 'axios';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { updateUserProfile } from '@/actions/userActions';
import JSZip from 'jszip';
import { useUserTemplates } from '@/hooks/use-user-templates';
import type { TemplateStyleConfig } from '@/lib/template-utils';
import { useDocumentTemplates } from '@/hooks/use-document-templates';
import { filterTemplatesForPlan, resolveDefaultTemplateId } from '@/lib/document-template-utils';

type DocumentType = 'proposal' | 'invoice' | 'contract' | 'act' | 'ks2' | 'ks3' | 'ks6a';
type FileFormat = 'pdf' | 'docx' | 'xlsx';

interface DocumentGenerationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    project: HistoryRequest | null;
    specifications: any[];
    quoteConfig: QuoteConfig;
    companies: Company[];
    projects?: HistoryRequest[];
    isGroupWorkActive?: boolean;
}

export function DocumentGenerationDialog({ isOpen, onClose, project, specifications, quoteConfig, companies, projects = [], isGroupWorkActive = false }: DocumentGenerationDialogProps) {
    const { user, setUser, effectivePlan } = useAppContext();
    const { toast } = useToast();
    const [isGenerating, startGenerating] = useTransition();

    const [docType, setDocType] = useState<DocumentType>('proposal');
    const [contractorId, setContractorId] = useState<string>(companies.find(c => c.isDefault && !c.isClient)?.id || companies.find(c => !c.isClient)?.id || '');
    const [clientId, setClientId] = useState<string>(companies.find(c => c.isDefault && c.isClient)?.id || companies.find(c => c.isClient)?.id || '');
    const [advanceType, setAdvanceType] = useState<'percent' | 'fixed'>('percent');
    const [advanceValue, setAdvanceValue] = useState<number>(30);
    const [isClientFormOpen, setIsClientFormOpen] = useState(false);
    const [invoiceKind, setInvoiceKind] = useState<'advance' | 'final'>('advance');
    const [advanceBasis, setAdvanceBasis] = useState<'project' | 'contract'>('project');
    const [contractNumber, setContractNumber] = useState('');
    const [contractDate, setContractDate] = useState('');
    const [contractBasisText, setContractBasisText] = useState('Авансовый платеж по договору №{number} от {date} на проведение электромонтажных работ');
    const [generateAct, setGenerateAct] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    const { finalTotal } = calculateProjectTotals(specifications, quoteConfig);
    const isGroupContext = isGroupWorkActive && projects.length > 1;

    const { templates: customTemplates } = useUserTemplates({ enabled: isOpen });
    const { templates: globalTemplates, settings: templateSettings } = useDocumentTemplates({ enabled: isOpen });
    const customProposalTemplates = useMemo(
        () => customTemplates.filter((template) => template.docType === 'proposal'),
        [customTemplates],
    );
    const customTemplatesById = useMemo(
        () => new Map(customProposalTemplates.map((template) => [template.id, template])),
        [customProposalTemplates],
    );
    const globalTemplatesById = useMemo(
        () => new Map(globalTemplates.map((template) => [template.id, template])),
        [globalTemplates],
    );

    useEffect(() => {
        if (invoiceKind === 'advance' && generateAct) {
            setGenerateAct(false);
        }
    }, [invoiceKind, generateAct]);

    const baseTemplateOptions = useMemo(() => {
        const options = filterTemplatesForPlan(globalTemplates, templateSettings, effectivePlan, docType);
        if (effectivePlan === 'Free') {
          const fallbackId = docType === 'invoice' ? 'invoice-1c-v1' : docType === 'contract' ? 'contract-base-v1' : 'base-template-v1';
          const defaultId = resolveDefaultTemplateId(templateSettings, effectivePlan, docType, fallbackId);
          return options.filter((tpl) => tpl.id === defaultId);
        }
        return options;
    }, [globalTemplates, templateSettings, effectivePlan, docType]);

    const customTemplateOptions = docType === 'proposal' && effectivePlan !== 'Free'
        ? customProposalTemplates
        : [];

    const templateOptions = [...baseTemplateOptions, ...customTemplateOptions];

    const fallbackId = docType === 'invoice' ? 'invoice-1c-v1' : docType === 'contract' ? 'contract-base-v1' : 'base-template-v1';
    const defaultTemplateId = resolveDefaultTemplateId(templateSettings, effectivePlan, docType, templateOptions[0]?.id || fallbackId);
    const activeTemplateId = selectedTemplateId || user?.documentTemplates?.[docType] || defaultTemplateId || fallbackId;
    const activeTemplateConfig = (customTemplatesById.get(activeTemplateId) || globalTemplatesById.get(activeTemplateId) || null) as TemplateStyleConfig | null;

    const resolveProjectName = (proj: HistoryRequest) => proj.analysisDetails?.objectName || proj.fileName || 'Проект';
    const resolveProjectSpecs = (proj: HistoryRequest) => proj.outputSpecifications.filter(item => !item.isRecommended);
    const resolveProjectQuoteConfig = (proj: HistoryRequest) => proj.quoteConfig || initialQuoteConfig;
    const resolveScopeProjects = () => (isGroupContext ? projects : (project ? [project] : []));

    const scopeProjects = resolveScopeProjects();
    const scopeTotalsSum = scopeProjects.reduce((acc, proj) => acc + calculateProjectTotals(resolveProjectSpecs(proj), resolveProjectQuoteConfig(proj)).finalTotal, 0);
    const advanceBaseTotal = isGroupContext ? scopeTotalsSum : finalTotal;
    const advanceAmount = advanceType === 'percent' ? advanceBaseTotal * (advanceValue / 100) : advanceValue;
    const safeAdvanceAmount = Number.isFinite(advanceAmount) ? advanceAmount : 0;

    const requiresClient = ['invoice', 'contract', 'act', 'ks2', 'ks3', 'ks6a'].includes(docType);
    const showInvoiceSettings = docType === 'invoice';
    const showAdvanceSettings = docType === 'invoice' && invoiceKind === 'advance';
    const showContractAdvance = docType === 'contract';
    const showContractBasisMeta = docType === 'invoice' && invoiceKind === 'advance' && advanceBasis === 'contract';
    const showContractMeta = showContractBasisMeta || ['act', 'ks2', 'ks3', 'ks6a'].includes(docType);
    const allowDocx = docType === 'proposal' && !isGroupContext;
    const allowXlsx = docType === 'proposal';

    const extractExpirationMs = (value: any): number | null => {
        if (!value) return null;
        if (typeof value === 'number') return value;
        if (value instanceof Date) return value.getTime();
        if (typeof value === 'object' && typeof value.toDate === 'function') {
            return value.toDate().getTime();
        }
        return null;
    };

    const refreshSignedUrl = async (objectKey: string) => {
        const refreshResponse = await fetch('/api/s3-refresh-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objectKey, bucketType: 'user_docs' }),
        });
        if (!refreshResponse.ok) {
            throw new Error((await refreshResponse.json()).error || 'Не удалось обновить ссылку.');
        }
        return refreshResponse.json() as Promise<{ newAccessUrl: string; newExpirationTimestamp: number }>;
    };

    const ensureAssetUrl = async (url?: string | null, objectKey?: string | null, expiresAt?: any) => {
        if (!url || !objectKey) return { url, updated: false, expiresAt: extractExpirationMs(expiresAt) };
        const expirationMs = extractExpirationMs(expiresAt);
        if (!expirationMs || expirationMs > Date.now() + 30_000) {
            return { url, updated: false, expiresAt: expirationMs };
        }
        const refreshed = await refreshSignedUrl(objectKey);
        return { url: refreshed.newAccessUrl, updated: true, expiresAt: refreshed.newExpirationTimestamp };
    };

    const fetchImageBuffer = async (imageUrl: string): Promise<ArrayBuffer | null> => {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) return null;
            return await response.arrayBuffer();
        } catch (error) {
            console.error('Failed to fetch image buffer:', error);
            return null;
        }
    };

    type GeneratedFile = { blob: Blob; fileName: string };

    const getProjectTotals = (proj: HistoryRequest) => {
        const specs = resolveProjectSpecs(proj);
        const config = resolveProjectQuoteConfig(proj);
        return calculateProjectTotals(specs, config);
    };

    const buildSections = (list: HistoryRequest[]) => list.map((proj) => ({
        projectName: resolveProjectName(proj),
        analysisDetails: proj.analysisDetails,
        specifications: resolveProjectSpecs(proj),
        quoteConfig: resolveProjectQuoteConfig(proj),
        totals: getProjectTotals(proj),
    }));

    const generateDocuments = async (format: FileFormat): Promise<GeneratedFile[]> => {
        const contractor = companies.find(c => c.id === contractorId);
        const client = companies.find(c => c.id === clientId);

        const baseProject = project || projects[0];
        if (!contractor || !baseProject) return [];

        if (docType !== 'proposal' && format !== 'pdf') {
            throw new Error('Для этого документа доступен только PDF.');
        }

        const groupName = baseProject.analysisDetails?.objectName || baseProject.fileName || 'Группа проектов';
        const baseName = baseProject.analysisDetails?.objectName || baseProject.fileName || 'проект';

        let signatureUrl = user?.signatureUrl || null;
        let stampUrl = user?.stampUrl || null;
        let signatureObjectKey = user?.signatureObjectKey || null;
        let stampObjectKey = user?.stampObjectKey || null;
        let signatureUrlExpirationTimestamp = user?.signatureUrlExpirationTimestamp || null;
        let stampUrlExpirationTimestamp = user?.stampUrlExpirationTimestamp || null;

        if (user) {
            const refreshedSignature = await ensureAssetUrl(
                signatureUrl,
                signatureObjectKey,
                signatureUrlExpirationTimestamp,
            );
            const refreshedStamp = await ensureAssetUrl(
                stampUrl,
                stampObjectKey,
                stampUrlExpirationTimestamp,
            );

            signatureUrl = refreshedSignature.url || null;
            stampUrl = refreshedStamp.url || null;
            signatureUrlExpirationTimestamp = refreshedSignature.expiresAt;
            stampUrlExpirationTimestamp = refreshedStamp.expiresAt;

            if (refreshedSignature.updated || refreshedStamp.updated) {
                const result = await updateUserProfile({
                    userId: user.uid,
                    displayName: user.displayName,
                    telegramUsername: user.telegramUsername,
                    signatureUrl,
                    signatureObjectKey,
                    signatureUrlExpirationTimestamp: signatureUrlExpirationTimestamp ?? null,
                    stampUrl,
                    stampObjectKey,
                    stampUrlExpirationTimestamp: stampUrlExpirationTimestamp ?? null,
                });
                if (result.success) {
                    setUser({
                        ...user,
                        signatureUrl,
                        signatureObjectKey,
                        signatureUrlExpirationTimestamp,
                        stampUrl,
                        stampObjectKey,
                        stampUrlExpirationTimestamp,
                    });
                }
            }
        }

        const buildInvoiceItems = (invoiceProjects: HistoryRequest[]) => {
            const totalsByProject = invoiceProjects.map(proj => ({
                project: proj,
                totals: getProjectTotals(proj),
            }));
            const totalSum = totalsByProject.reduce((acc, item) => acc + item.totals.finalTotal, 0);

            if (invoiceKind === 'advance') {
                if (advanceBasis === 'contract') {
                    const dateText = contractDate ? format(new Date(contractDate), 'dd.MM.yyyy') : '__.__.____';
                    const numberText = contractNumber || '___';
                    const resolvedText = (contractBasisText || '').replace('{number}', numberText).replace('{date}', dateText).trim()
                        || `Авансовый платеж по договору №${numberText} от ${dateText} на проведение электромонтажных работ`;
                    const advanceTotal = advanceType === 'percent' ? totalSum * (advanceValue / 100) : advanceValue;
                    return [{ name: resolvedText, quantity: 1, unit: 'усл', price: advanceTotal }];
                }

                if (advanceType === 'percent') {
                    return totalsByProject.map(({ project: proj, totals }) => ({
                        name: `Авансовый платеж по проведению электромонтажных работ: ${resolveProjectName(proj)}`,
                        quantity: 1,
                        unit: 'усл',
                        price: totals.finalTotal * (advanceValue / 100),
                    }));
                }

                if (invoiceProjects.length <= 1) {
                    return [{
                        name: `Авансовый платеж по проведению электромонтажных работ: ${resolveProjectName(invoiceProjects[0])}`,
                        quantity: 1,
                        unit: 'усл',
                        price: advanceValue,
                    }];
                }

                const baseTotal = totalSum || invoiceProjects.length;
                return totalsByProject.map(({ project: proj, totals }) => ({
                    name: `Авансовый платеж по проведению электромонтажных работ: ${resolveProjectName(proj)}`,
                    quantity: 1,
                    unit: 'усл',
                    price: baseTotal ? (advanceValue * (totals.finalTotal / baseTotal)) : (advanceValue / invoiceProjects.length),
                }));
            }

            return totalsByProject.map(({ project: proj, totals }) => ({
                name: `Окончательный расчет за электромонтажные работы: ${resolveProjectName(proj)}`,
                quantity: 1,
                unit: 'усл',
                price: totals.finalTotal,
            }));
        };

        const scopeProjects = resolveScopeProjects();
        if (scopeProjects.length === 0) {
            toast({ title: 'Нет проектов', variant: 'destructive' });
            return [];
        }

        const files: GeneratedFile[] = [];

        switch (docType) {
            case 'invoice': {
                if (!client) {
                    toast({ title: 'Клиент не выбран', variant: 'destructive' });
                    return [];
                }
                const invoiceProjects = scopeProjects;
                const items = buildInvoiceItems(invoiceProjects);
                const totalAmount = items.reduce((acc, item) => acc + (item.price || 0), 0);

                const invoiceNumber = `СЧ-${Date.now()}`;
                const invoiceDate = new Date();
                const invoiceDoc = (
                    <InvoiceTemplate
                        invoiceNumber={invoiceNumber}
                        invoiceDate={invoiceDate}
                        seller={contractor}
                        buyer={client}
                        items={items}
                        signatureUrl={signatureUrl}
                        stampUrl={stampUrl}
                        templateId={activeTemplateId}
                    />
                );
                const invoiceBlob = await pdf(invoiceDoc).toBlob();
                const invoiceFileName = `Счет_${invoiceNumber}_от_${format(invoiceDate, 'dd.MM.yyyy')}.pdf`;
                files.push({ blob: invoiceBlob, fileName: invoiceFileName });

                try {
                    const presignedUrlResponse = await fetch('/api/s3-upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileName: invoiceFileName, fileType: invoiceBlob.type, bucketType: 'user_docs' }),
                    });
                    if (!presignedUrlResponse.ok) {
                        throw new Error((await presignedUrlResponse.json()).error || 'Не удалось получить ссылку для загрузки в S3.');
                    }
                    const { uploadUrl, accessUrl } = await presignedUrlResponse.json();
                    await axios.put(uploadUrl, invoiceBlob, { headers: { 'Content-Type': invoiceBlob.type } });
                    const fileUri = accessUrl;

                    await addDoc(collection(db, 'invoices'), {
                        userId: user!.uid,
                        projectId: project?.id || null,
                        projectIds: invoiceProjects.map(p => p.id),
                        invoiceNumber,
                        invoiceDate: serverTimestamp(),
                        buyerName: client.name,
                        totalAmount,
                        downloadUrl: fileUri,
                        status: 'Ожидает оплаты',
                    });
                } catch (e) {
                    console.error('Failed to save invoice to S3/DB', e);
                }

                if (invoiceKind === 'final' && generateAct) {
                    const sections = buildSections(invoiceProjects);
                    const actDoc = (
                        <ActTemplate
                            contractor={contractor}
                            client={client}
                            sections={sections}
                            contractNumber={contractNumber}
                            contractDate={contractDate}
                        />
                    );
                    const actBlob = await pdf(actDoc).toBlob();
                    files.push({ blob: actBlob, fileName: `Акт_${isGroupContext ? groupName : baseName}.pdf` });
                }

                break;
            }
            case 'contract': {
                if (!client) {
                    toast({ title: 'Клиент не выбран', variant: 'destructive' });
                    return [];
                }
                const contractNumber = `ДОГ-${Date.now()}`;
                const contractDate = new Date();
                const workStartDate = new Date();
                const workEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                if (isGroupContext) {
                    const appendices = scopeProjects.map((proj, index) => ({
                        title: `Приложение №${index + 1}`,
                        projectName: resolveProjectName(proj),
                        specifications: resolveProjectSpecs(proj),
                        quoteConfig: resolveProjectQuoteConfig(proj),
                    }));
                    const groupTotal = scopeProjects.reduce((acc, proj) => acc + getProjectTotals(proj).finalTotal, 0);
                    const contractAdvanceAmount = advanceType === 'percent' ? groupTotal * (advanceValue / 100) : advanceValue;
                    const contractDoc = (
                        <ContractTemplate
                            contractNumber={contractNumber}
                            contractDate={contractDate}
                            contractor={contractor as any}
                            client={client}
                            objectAddress={groupName}
                            totalAmount={groupTotal}
                            advanceAmount={contractAdvanceAmount}
                            workStartDate={workStartDate}
                            workEndDate={workEndDate}
                            specifications={[]}
                            quoteConfig={quoteConfig}
                            signatureUrl={signatureUrl}
                            stampUrl={stampUrl}
                            templateId={activeTemplateId}
                            appendices={appendices}
                        />
                    );
                    const contractBlob = await pdf(contractDoc).toBlob();
                    files.push({ blob: contractBlob, fileName: `Договор_${contractNumber}_от_${format(contractDate, 'dd.MM.yyyy')}.pdf` });
                    break;
                }

                const contractDoc = (
                    <ContractTemplate
                        contractNumber={contractNumber}
                        contractDate={contractDate}
                        contractor={contractor as any}
                        client={client}
                        objectAddress={project?.analysisDetails?.objectName || project?.fileName || '____________'}
                        totalAmount={finalTotal}
                        advanceAmount={safeAdvanceAmount}
                        workStartDate={workStartDate}
                        workEndDate={workEndDate}
                        specifications={specifications}
                        quoteConfig={quoteConfig}
                        signatureUrl={signatureUrl}
                        stampUrl={stampUrl}
                        templateId={activeTemplateId}
                    />
                );
                const contractBlob = await pdf(contractDoc).toBlob();
                files.push({ blob: contractBlob, fileName: `Договор_${contractNumber}_от_${format(contractDate, 'dd.MM.yyyy')}.pdf` });
                break;
            }
            case 'proposal':
            default: {
                if (isGroupContext) {
                    if (format === 'xlsx') {
                        const excelBlob = await generateObjectSummaryExcel(scopeProjects, contractor);
                        files.push({ blob: excelBlob, fileName: `КП_${groupName}.xlsx` });
                        break;
                    }
                    if (format !== 'pdf') {
                        throw new Error('Для группы доступен только PDF или XLSX.');
                    }
                    const sections = buildSections(scopeProjects);
                    const pdfDoc = (
                        <GroupDocumentTemplate
                            company={contractor}
                            sections={sections}
                            templateId={activeTemplateId}
                            templateConfig={activeTemplateConfig as TemplateStyleConfig | null}
                            signatureUrl={signatureUrl}
                            stampUrl={stampUrl}
                            includeSummary={true}
                        />
                    );
                    const groupBlob = await pdf(pdfDoc).toBlob();
                    files.push({ blob: groupBlob, fileName: `КП_${groupName}.pdf` });
                    break;
                }

                const docParams = {
                    company: contractor,
                    specifications,
                    analysisDetails: project?.analysisDetails || null,
                    quoteConfig,
                    totals: calculateProjectTotals(specifications, quoteConfig),
                    templateId: activeTemplateId,
                };
                if (format === 'docx') {
                    const signatureBuffer = signatureUrl ? await fetchImageBuffer(signatureUrl) : null;
                    const stampBuffer = stampUrl ? await fetchImageBuffer(stampUrl) : null;
                    const docxBlob = await generateDocx({
                        ...(docParams as any),
                        signatureBuffer,
                        stampBuffer,
                        templateId: activeTemplateId,
                        templateConfig: activeTemplateConfig as TemplateStyleConfig | null,
                    });
                    files.push({ blob: docxBlob, fileName: `КП_${baseName}.docx` });
                } else if (format === 'xlsx') {
                    const excelBlob = await generateExcel(docParams as any);
                    files.push({ blob: excelBlob, fileName: `КП_${baseName}.xlsx` });
                } else {
                    const pdfDoc = (
                        <DocumentTemplate
                            {...docParams}
                            templateId={activeTemplateId}
                            templateConfig={activeTemplateConfig as TemplateStyleConfig | null}
                            signatureUrl={signatureUrl}
                            stampUrl={stampUrl}
                        />
                    );
                    const pdfBlob = await pdf(pdfDoc).toBlob();
                    files.push({ blob: pdfBlob, fileName: `КП_${baseName}.pdf` });
                }
                break;
            }
            case 'act': {
                if (!client) {
                    toast({ title: 'Клиент не выбран', variant: 'destructive' });
                    return [];
                }
                const sections = buildSections(scopeProjects);
                const actDoc = (
                    <ActTemplate
                        contractor={contractor}
                        client={client}
                        sections={sections}
                        contractNumber={contractNumber}
                        contractDate={contractDate}
                    />
                );
                const actBlob = await pdf(actDoc).toBlob();
                files.push({ blob: actBlob, fileName: `Акт_${isGroupContext ? groupName : baseName}.pdf` });
                break;
            }
            case 'ks2': {
                if (!client) {
                    toast({ title: 'Клиент не выбран', variant: 'destructive' });
                    return [];
                }
                const sections = buildSections(scopeProjects);
                const ks2Doc = (
                    <Ks2Template
                        contractor={contractor}
                        client={client}
                        sections={sections}
                        contractNumber={contractNumber}
                        contractDate={contractDate}
                    />
                );
                const ks2Blob = await pdf(ks2Doc).toBlob();
                files.push({ blob: ks2Blob, fileName: `КС-2_${isGroupContext ? groupName : baseName}.pdf` });
                break;
            }
            case 'ks3': {
                if (!client) {
                    toast({ title: 'Клиент не выбран', variant: 'destructive' });
                    return [];
                }
                const sections = buildSections(scopeProjects);
                const ks3Doc = (
                    <Ks3Template
                        contractor={contractor}
                        client={client}
                        sections={sections}
                        contractNumber={contractNumber}
                        contractDate={contractDate}
                    />
                );
                const ks3Blob = await pdf(ks3Doc).toBlob();
                files.push({ blob: ks3Blob, fileName: `КС-3_${isGroupContext ? groupName : baseName}.pdf` });
                break;
            }
            case 'ks6a': {
                if (!client) {
                    toast({ title: 'Клиент не выбран', variant: 'destructive' });
                    return [];
                }
                const sections = buildSections(scopeProjects);
                const ks6aDoc = (
                    <Ks6aTemplate
                        contractor={contractor}
                        client={client}
                        sections={sections}
                        contractNumber={contractNumber}
                        contractDate={contractDate}
                    />
                );
                const ks6aBlob = await pdf(ks6aDoc).toBlob();
                files.push({ blob: ks6aBlob, fileName: `КС-6а_${isGroupContext ? groupName : baseName}.pdf` });
                break;
            }
        }

        return files;
    };

    const handleDownload = async (format: FileFormat) => {
        startGenerating(async () => {
            toast({ title: `Генерация ${format.toUpperCase()}...`, description: 'Пожалуйста, подождите.' });
            try {
                const files = await generateDocuments(format);
                if (!files.length) return;

                if (files.length === 1) {
                    saveAs(files[0].blob, files[0].fileName);
                    return;
                }

                const baseProject = project || projects[0];
                const groupName = baseProject?.analysisDetails?.objectName || baseProject?.fileName || 'документы';
                const zip = new JSZip();
                files.forEach(file => zip.file(file.fileName, file.blob));
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                saveAs(zipBlob, `Группа_${groupName}_${docType}.zip`);
                toast({ title: 'ZIP готов', description: `Сформировано файлов: ${files.length}.` });
            } catch (error) {
                console.error('Download Error:', error);
                toast({ title: 'Ошибка генерации', description: 'Не удалось создать файл.', variant: 'destructive' });
            }
        });
    };

    const handleSendToBot = async (format: FileFormat) => {
        if (!user?.telegramChatId) {
            toast({ title: 'Telegram не привязан', description: 'Привяжите аккаунт Telegram в профиле.', variant: 'destructive' });
            return;
        }
        startGenerating(async () => {
            try {
                const files = await generateDocuments(format);
                if (!files.length) throw new Error('Не удалось создать файл.');

                let payloadBlob = files[0].blob;
                let payloadName = files[0].fileName;

                if (files.length > 1) {
                    const baseProject = project || projects[0];
                    const groupName = baseProject?.analysisDetails?.objectName || baseProject?.fileName || 'документы';
                    const zip = new JSZip();
                    files.forEach(file => zip.file(file.fileName, file.blob));
                    payloadBlob = await zip.generateAsync({ type: 'blob' });
                    payloadName = `Группа_${groupName}_${docType}.zip`;
                }

                const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(payloadBlob);
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });
                const result = await sendFileToTelegramUser({ fileData: base64Data, fileName: payloadName, fileMime: payloadBlob.type });
                if (!result.success) throw new Error(result.message);
                toast({ title: 'Успех', description: `Файл ${format.toUpperCase()} отправлен в Telegram.` });
            } catch (error: any) {
                toast({ title: 'Ошибка отправки', description: error.message, variant: 'destructive' });
            }
        });
    }

    return (
        <>
            <CompanyFormDialog
                isOpen={isClientFormOpen}
                onClose={() => setIsClientFormOpen(false)}
                onSuccess={() => { /* Company list will update via snapshot */ setIsClientFormOpen(false); }}
                isClientForm={true}
            />
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Настройка и выгрузка документов</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                            {isGroupContext
                                ? 'Документы будут сформированы по всей группе проектов.'
                                : 'Документы будут сформированы по выбранной вкладке.'}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <Label>Тип документа</Label>
                                <Select value={docType} onValueChange={(v) => { setDocType(v as DocumentType); setSelectedTemplateId(''); }}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="proposal">Коммерческое предложение</SelectItem>
                                        <SelectItem value="invoice">Счет</SelectItem>
                                        <SelectItem value="contract">Договор подряда</SelectItem>
                                        <SelectItem value="act">Акт выполненных работ</SelectItem>
                                        <SelectItem value="ks2">КС-2</SelectItem>
                                        <SelectItem value="ks3">КС-3</SelectItem>
                                        <SelectItem value="ks6a">КС-6а</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             {showInvoiceSettings && (
                                <div>
                                    <Label>Тип счета</Label>
                                    <RadioGroup value={invoiceKind} onValueChange={(v) => setInvoiceKind(v as any)} className="mt-2 flex flex-wrap gap-4">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="advance" id="inv-advance"/> <Label htmlFor="inv-advance">Авансовый</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="final" id="inv-final"/> <Label htmlFor="inv-final">Финальный</Label></div>
                                    </RadioGroup>
                                </div>
                             )}
                        </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label>Исполнитель (Ваша компания)</Label>
                                <Select value={contractorId} onValueChange={setContractorId}>
                                    <SelectTrigger><SelectValue placeholder="Выберите контрагента..." /></SelectTrigger>
                                    <SelectContent>
                                        {companies.filter(c => !c.isClient).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             {requiresClient && (
                                 <div>
                                    <Label>Заказчик (Клиент)</Label>
                                    <div className="flex gap-1">
                                        <Select value={clientId} onValueChange={setClientId}>
                                            <SelectTrigger><SelectValue placeholder="Выберите клиента..." /></SelectTrigger>
                                            <SelectContent>
                                                {companies.filter(c => c.isClient).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Button variant="outline" size="icon" onClick={() => setIsClientFormOpen(true)}><PlusCircle className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                             )}
                        </div>

                        {showInvoiceSettings && (
                             <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                                <div className="text-sm font-medium">Параметры счета</div>
                                {showAdvanceSettings && (
                                  <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label>Формат аванса</Label>
                                        <RadioGroup value={advanceType} onValueChange={(v) => setAdvanceType(v as any)} className="flex flex-wrap gap-4">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="percent" id="adv-p"/> <Label htmlFor="adv-p">Процент</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="fixed" id="adv-f"/> <Label htmlFor="adv-f">Фикс. сумма</Label></div>
                                        </RadioGroup>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Значение</Label>
                                        <Input type="number" value={advanceValue} onChange={e => setAdvanceValue(Number(e.target.value))} />
                                        <div className="text-xs text-muted-foreground">Итого: {advanceAmount.toLocaleString('ru-RU')} ₽</div>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Основание</Label>
                                      <RadioGroup value={advanceBasis} onValueChange={(v) => setAdvanceBasis(v as any)} className="flex flex-wrap gap-4">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="project" id="adv-basis-project"/> <Label htmlFor="adv-basis-project">Проект(ы)</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="contract" id="adv-basis-contract"/> <Label htmlFor="adv-basis-contract">Договор</Label></div>
                                      </RadioGroup>
                                    </div>
                                  </>
                                )}
                                {showContractBasisMeta && (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label>Номер договора</Label>
                                        <Input value={contractNumber} onChange={e => setContractNumber(e.target.value)} placeholder="Напр., 15/24" />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Дата договора</Label>
                                        <Input type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Формулировка основания</Label>
                                      <Textarea value={contractBasisText} onChange={e => setContractBasisText(e.target.value)} rows={3} />
                                      <div className="text-xs text-muted-foreground">Используйте {`{number}`} и {`{date}`} для подстановки.</div>
                                    </div>
                                  </div>
                                )}
                                {invoiceKind === 'final' && (
                                  <div className="rounded-md border bg-background p-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <Label className="text-sm">Сформировать акт выполненных работ</Label>
                                        <div className="text-xs text-muted-foreground">Область: {isGroupContext ? 'вся группа' : 'текущая вкладка'}.</div>
                                      </div>
                                      <Switch checked={generateAct} onCheckedChange={setGenerateAct} />
                                    </div>
                                  </div>
                                )}
                             </div>
                        )}

                        {showContractAdvance && (
                          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                            <div className="text-sm font-medium">Аванс по договору</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Формат аванса</Label>
                                <RadioGroup value={advanceType} onValueChange={(v) => setAdvanceType(v as any)} className="flex flex-wrap gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="percent" id="contract-adv-p"/> <Label htmlFor="contract-adv-p">Процент</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="fixed" id="contract-adv-f"/> <Label htmlFor="contract-adv-f">Фикс. сумма</Label></div>
                                </RadioGroup>
                              </div>
                              <div className="space-y-2">
                                <Label>Значение</Label>
                                <Input type="number" value={advanceValue} onChange={e => setAdvanceValue(Number(e.target.value))} />
                                <div className="text-xs text-muted-foreground">Итого: {advanceAmount.toLocaleString('ru-RU')} ₽</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {showContractMeta && (
                          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                            <div className="text-sm font-medium">Реквизиты договора</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Номер договора</Label>
                                <Input value={contractNumber} onChange={e => setContractNumber(e.target.value)} placeholder="Напр., 15/24" />
                              </div>
                              <div className="space-y-2">
                                <Label>Дата договора</Label>
                                <Input type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} />
                              </div>
                            </div>
                          </div>
                        )}

                        {templateOptions.length > 0 && (
                          <div className="space-y-2">
                            <Label>Шаблон</Label>
                            <Select value={activeTemplateId} onValueChange={(value) => setSelectedTemplateId(value)}>
                              <SelectTrigger><SelectValue placeholder="Выберите шаблон" /></SelectTrigger>
                              <SelectContent>
                                {templateOptions.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.userId ? `${template.name} (ваш)` : template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                    </div>
                    <DialogFooter>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                                    Скачать
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => handleDownload('pdf')}><FileText className="mr-2 h-4 w-4"/>PDF</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDownload('docx')} disabled={!allowDocx}>
                                    <FileText className="mr-2 h-4 w-4"/>DOCX
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDownload('xlsx')} disabled={!allowXlsx}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4"/>Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={() => handleSendToBot('pdf')} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                            Отправить в Telegram
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
