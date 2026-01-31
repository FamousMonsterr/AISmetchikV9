// src/components/GroupZipDialog.tsx
"use client";

import { useMemo, useState, useTransition, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, type Company, type HistoryRequest, initialQuoteConfig } from '@/contexts/AppContext';
import { calculateProjectTotals } from '@/lib/calculation';
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
import templateCatalog from '@/lib/quote-templates.json';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';


type DocumentType = 'proposal' | 'invoice' | 'contract' | 'act' | 'ks2' | 'ks3' | 'ks6a';
type FileFormat = 'pdf' | 'docx' | 'xlsx';
type ExportMode = 'combined' | 'zip';
type ZipMode = 'perProject' | 'multiDoc';

interface GroupZipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projects: HistoryRequest[];
  companies: Company[];
}

const templateAccess = {
  Free: ['free'],
  PRO: ['free', 'pro'],
  Business: ['free', 'pro', 'business'],
  Enterprise: ['free', 'pro', 'business'],
} as const;

const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();

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

export function GroupZipDialog({ isOpen, onClose, projects, companies }: GroupZipDialogProps) {
  const { user, effectivePlan } = useAppContext();
  const { toast } = useToast();
  const [docType, setDocType] = useState<DocumentType>('proposal');
  const [formatType, setFormatType] = useState<FileFormat>('pdf');
  const [exportMode, setExportMode] = useState<ExportMode>('combined');
  const [zipMode, setZipMode] = useState<ZipMode>('perProject');
  const [selectedDocTypes, setSelectedDocTypes] = useState<DocumentType[]>(['proposal']);
  const [contractorId, setContractorId] = useState<string>(companies.find(c => c.isDefault && !c.isClient)?.id || companies.find(c => !c.isClient)?.id || '');
  const [clientId, setClientId] = useState<string>(companies.find(c => c.isDefault && c.isClient)?.id || companies.find(c => c.isClient)?.id || '');
  const [advanceType, setAdvanceType] = useState<'percent' | 'fixed'>('percent');
  const [advanceValue, setAdvanceValue] = useState<number>(30);
  const [invoiceKind, setInvoiceKind] = useState<'advance' | 'final'>('advance');
  const [advanceBasis, setAdvanceBasis] = useState<'project' | 'contract'>('project');
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [contractBasisText, setContractBasisText] = useState('Авансовый платеж по договору №{number} от {date} на проведение электромонтажных работ');
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');
  const [isGenerating, startGenerating] = useTransition();

  const resolveTemplateIdFor = (type: DocumentType) => {
    const allowed = templateAccess[effectivePlan ?? 'Free'] || ['free'];
    const options = templateCatalog.filter(template => template.docType === type && allowed.includes(template.status as (typeof allowed)[number]));
    return user?.documentTemplates?.[type] || options[0]?.id || (type === 'invoice' ? 'invoice-1c-v1' : type === 'contract' ? 'contract-base-v1' : 'base-template-v1');
  };


  const templateOptions = useMemo(() => {
    const allowed = templateAccess[effectivePlan ?? 'Free'] || ['free'];
    return templateCatalog.filter((template) => template.docType === docType && allowed.includes(template.status as (typeof allowed)[number]));
  }, [docType, effectivePlan]);

  const resolvedTemplateId = useMemo(() => {
    return activeTemplateId || resolveTemplateIdFor(docType);
  }, [activeTemplateId, docType, effectivePlan, user]);

  const groupName = useMemo(() => {
    const fallback = projects[0]?.analysisDetails?.objectName || projects[0]?.fileName || 'группа';
    return sanitizeFileName(fallback);
  }, [projects]);

  useEffect(() => {
    if (!contractorId) {
      const fallbackContractor = companies.find(c => c.isDefault && !c.isClient)?.id || companies.find(c => !c.isClient)?.id || '';
      if (fallbackContractor) setContractorId(fallbackContractor);
    }
    if (!clientId) {
      const fallbackClient = companies.find(c => c.isDefault && c.isClient)?.id || companies.find(c => c.isClient)?.id || '';
      if (fallbackClient) setClientId(fallbackClient);
    }
  }, [companies, contractorId, clientId]);

  useEffect(() => {
    if (exportMode === 'combined') {
      if (docType !== 'proposal') setFormatType('pdf');
      return;
    }
    if (zipMode === 'multiDoc') {
      setFormatType('pdf');
      return;
    }
    if (docType !== 'proposal') {
      setFormatType('pdf');
    }
  }, [exportMode, zipMode, docType]);

  const handleDocTypeChange = (value: DocumentType) => {
    setDocType(value);
    if (value !== 'proposal') {
      setFormatType('pdf');
    }
    setActiveTemplateId('');
  };

  const invoiceActive = exportMode === 'zip' && zipMode === 'multiDoc'
    ? selectedDocTypes.includes('invoice')
    : docType === 'invoice';
  const contractActive = exportMode === 'zip' && zipMode === 'multiDoc'
    ? selectedDocTypes.includes('contract')
    : docType === 'contract';
  const showInvoiceSettings = invoiceActive;
  const showAdvanceSettings = invoiceActive && invoiceKind === 'advance';
  const showContractBasisMeta = showAdvanceSettings && advanceBasis === 'contract';
  const allowDocx = exportMode === 'zip' && zipMode === 'perProject' && docType === 'proposal';
  const allowXlsx = docType === 'proposal' && (exportMode === 'combined' || (exportMode === 'zip' && zipMode === 'perProject'));

  const toggleDocTypeSelection = (value: DocumentType) => {
    setSelectedDocTypes(prev => {
      if (prev.includes(value)) {
        const next = prev.filter(item => item !== value);
        return next.length ? next : prev;
      }
      return [...prev, value];
    });
  };

  const resolveProjectName = (proj: HistoryRequest) => proj.analysisDetails?.objectName || proj.fileName || 'Проект';
  const resolveProjectSpecs = (proj: HistoryRequest) => proj.outputSpecifications.filter(item => !item.isRecommended);
  const resolveProjectQuoteConfig = (proj: HistoryRequest) => proj.quoteConfig || initialQuoteConfig;

  const buildSections = (list: HistoryRequest[]) => list.map((proj) => {
    const specs = resolveProjectSpecs(proj);
    const config = resolveProjectQuoteConfig(proj);
    return {
      projectName: resolveProjectName(proj),
      analysisDetails: proj.analysisDetails,
      specifications: specs,
      quoteConfig: config,
      totals: calculateProjectTotals(specs, config),
    };
  });

  const buildInvoiceItemsForProjects = (list: HistoryRequest[]) => {
    const totalsByProject = list.map(proj => ({
      project: proj,
      totals: calculateProjectTotals(resolveProjectSpecs(proj), resolveProjectQuoteConfig(proj)),
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

      if (list.length <= 1) {
        return [{
          name: `Авансовый платеж по проведению электромонтажных работ: ${resolveProjectName(list[0])}`,
          quantity: 1,
          unit: 'усл',
          price: advanceValue,
        }];
      }

      const baseTotal = totalSum || list.length;
      return totalsByProject.map(({ project: proj, totals }) => ({
        name: `Авансовый платеж по проведению электромонтажных работ: ${resolveProjectName(proj)}`,
        quantity: 1,
        unit: 'усл',
        price: baseTotal ? (advanceValue * (totals.finalTotal / baseTotal)) : (advanceValue / list.length),
      }));
    }

    return totalsByProject.map(({ project: proj, totals }) => ({
      name: `Окончательный расчет за электромонтажные работы: ${resolveProjectName(proj)}`,
      quantity: 1,
      unit: 'усл',
      price: totals.finalTotal,
    }));
  };

  const generateCombinedFile = async (
    type: DocumentType,
    format: FileFormat,
    contractor: Company,
    client?: Company,
  ): Promise<{ blob: Blob; fileName: string } | null> => {
    if (!projects.length) return null;
    const templateId = resolveTemplateIdFor(type);
    const groupTitle = projects[0]?.analysisDetails?.objectName || projects[0]?.fileName || 'Группа проектов';
    const safeGroupName = sanitizeFileName(groupTitle);

    if (type !== 'proposal' && format !== 'pdf') {
      throw new Error('Для выбранного документа доступен только PDF.');
    }

    if (type === 'proposal') {
      if (format === 'xlsx') {
        const blob = await generateObjectSummaryExcel(projects, contractor);
        return { blob, fileName: `КП_${safeGroupName}.xlsx` };
      }
      const sections = buildSections(projects);
      const pdfDoc = (
        <GroupDocumentTemplate
          company={contractor}
          sections={sections}
          templateId={templateId}
          signatureUrl={user?.signatureUrl || null}
          stampUrl={user?.stampUrl || null}
          includeSummary={true}
        />
      );
      const blob = await pdf(pdfDoc).toBlob();
      return { blob, fileName: `КП_${safeGroupName}.pdf` };
    }

    if (!client) {
      throw new Error('Не выбран клиент для документа.');
    }

    if (type === 'contract') {
      const appendices = projects.map((proj, index) => ({
        title: `Приложение №${index + 1}`,
        projectName: resolveProjectName(proj),
        specifications: resolveProjectSpecs(proj),
        quoteConfig: resolveProjectQuoteConfig(proj),
      }));
      const groupTotal = appendices.reduce((acc, appendix) => {
        const totals = calculateProjectTotals(appendix.specifications, appendix.quoteConfig);
        return acc + totals.finalTotal;
      }, 0);
      const contractAdvanceAmount = advanceType === 'percent' ? groupTotal * (advanceValue / 100) : advanceValue;
      const contractNumberValue = `ДОГ-${Date.now()}`;
      const contractDateValue = new Date();
      const workStartDate = new Date();
      const workEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const contractDoc = (
        <ContractTemplate
          contractNumber={contractNumberValue}
          contractDate={contractDateValue}
          contractor={contractor as any}
          client={client}
          objectAddress={groupTitle}
          totalAmount={groupTotal}
          advanceAmount={contractAdvanceAmount}
          workStartDate={workStartDate}
          workEndDate={workEndDate}
          specifications={[]}
          quoteConfig={initialQuoteConfig}
          signatureUrl={user?.signatureUrl || null}
          stampUrl={user?.stampUrl || null}
          templateId={templateId}
          appendices={appendices}
        />
      );
      const blob = await pdf(contractDoc).toBlob();
      return { blob, fileName: `Договор_${contractNumberValue}_от_${format(contractDateValue, 'dd.MM.yyyy')}.pdf` };
    }

    if (type === 'invoice') {
      const items = buildInvoiceItemsForProjects(projects);
      const invoiceNumber = `СЧ-${Date.now()}`;
      const invoiceDate = new Date();
      const invoiceDoc = (
        <InvoiceTemplate
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          seller={contractor}
          buyer={client}
          items={items}
          signatureUrl={user?.signatureUrl || null}
          stampUrl={user?.stampUrl || null}
          templateId={templateId}
        />
      );
      const blob = await pdf(invoiceDoc).toBlob();
      return { blob, fileName: `Счет_${invoiceNumber}_от_${format(invoiceDate, 'dd.MM.yyyy')}.pdf` };
    }

    const sections = buildSections(projects);
    const commonParams = {
      contractor,
      client,
      sections,
      contractNumber,
      contractDate,
    };

    if (type === 'act') {
      const actDoc = <ActTemplate {...commonParams} />;
      const blob = await pdf(actDoc).toBlob();
      return { blob, fileName: `Акт_${safeGroupName}.pdf` };
    }
    if (type === 'ks2') {
      const ks2Doc = <Ks2Template {...commonParams} />;
      const blob = await pdf(ks2Doc).toBlob();
      return { blob, fileName: `КС-2_${safeGroupName}.pdf` };
    }
    if (type === 'ks3') {
      const ks3Doc = <Ks3Template {...commonParams} />;
      const blob = await pdf(ks3Doc).toBlob();
      return { blob, fileName: `КС-3_${safeGroupName}.pdf` };
    }
    if (type === 'ks6a') {
      const ks6aDoc = <Ks6aTemplate {...commonParams} />;
      const blob = await pdf(ks6aDoc).toBlob();
      return { blob, fileName: `КС-6а_${safeGroupName}.pdf` };
    }

    return null;
  };

  const generateProjectFile = async (
    project: HistoryRequest,
    contractor: Company,
    client: Company | undefined,
    signatureUrl: string | null,
    stampUrl: string | null,
    signatureBuffer: ArrayBuffer | null,
    stampBuffer: ArrayBuffer | null,
    index: number,
  ): Promise<{ blob: Blob; fileName: string } | null> => {
    const specifications = project.outputSpecifications.filter(item => !item.isRecommended);
    const quoteConfig = project.quoteConfig || initialQuoteConfig;
    const totals = calculateProjectTotals(specifications, quoteConfig);
    const baseName = sanitizeFileName(project.analysisDetails?.objectName || project.fileName || `project-${index + 1}`);

    if (!contractor) {
      throw new Error('Не выбрана компания-исполнитель.');
    }

    if (docType === 'proposal') {
      const docParams = {
        company: contractor,
        specifications,
        analysisDetails: project.analysisDetails,
        quoteConfig,
        totals,
        templateId: resolvedTemplateId,
      };

      if (formatType === 'docx') {
        const blob = await generateDocx({
          ...(docParams as any),
          signatureBuffer,
          stampBuffer,
          templateId: resolvedTemplateId,
        });
        return { blob, fileName: `КП_${baseName}.docx` };
      }
      if (formatType === 'xlsx') {
        const blob = await generateExcel(docParams as any);
        return { blob, fileName: `КП_${baseName}.xlsx` };
      }
      const pdfDoc = (
        <DocumentTemplate
          {...docParams}
          templateId={resolvedTemplateId}
          signatureUrl={signatureUrl}
          stampUrl={stampUrl}
        />
      );
      const blob = await pdf(pdfDoc).toBlob();
      return { blob, fileName: `КП_${baseName}.pdf` };
    }

    if (!client) {
      throw new Error('Не выбран клиент для документа.');
    }

    const advanceAmount = advanceType === 'percent'
      ? totals.finalTotal * (advanceValue / 100)
      : advanceValue;
    const safeAdvanceAmount = Number.isFinite(advanceAmount) ? advanceAmount : 0;

    if (docType === 'invoice') {
      const invoiceNumber = `СЧ-${Date.now()}-${index + 1}`;
      const invoiceDate = new Date();
      let items = [] as { name: string; quantity: number; unit: string; price: number }[];

      if (invoiceKind === 'advance') {
        if (advanceBasis === 'contract') {
          const dateText = contractDate ? format(new Date(contractDate), 'dd.MM.yyyy') : '__.__.____';
          const numberText = contractNumber || '___';
          const resolvedText = (contractBasisText || '').replace('{number}', numberText).replace('{date}', dateText).trim()
            || `Авансовый платеж по договору №${numberText} от ${dateText} на проведение электромонтажных работ`;
          items = [{ name: resolvedText, quantity: 1, unit: 'усл', price: safeAdvanceAmount }];
        } else {
          items = [{ name: `Авансовый платеж по проведению электромонтажных работ: ${baseName}`, quantity: 1, unit: 'усл', price: safeAdvanceAmount }];
        }
      } else {
        items = [{ name: `Окончательный расчет за электромонтажные работы: ${baseName}`, quantity: 1, unit: 'усл', price: totals.finalTotal }];
      }

      const invoiceDoc = (
        <InvoiceTemplate
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          seller={contractor}
          buyer={client}
          items={items}
          signatureUrl={signatureUrl}
          stampUrl={stampUrl}
          templateId={resolvedTemplateId}
        />
      );
      const blob = await pdf(invoiceDoc).toBlob();
      return { blob, fileName: `Счет_${baseName}_${format(invoiceDate, 'dd.MM.yyyy')}.pdf` };
    }

    const contractNumber = `ДОГ-${Date.now()}-${index + 1}`;
    const contractDate = new Date();
    const workStartDate = new Date();
    const workEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const contractDoc = (
      <ContractTemplate
        contractNumber={contractNumber}
        contractDate={contractDate}
        contractor={contractor as any}
        client={client}
        objectAddress={project.analysisDetails?.objectName || project.fileName || '____________'}
        totalAmount={totals.finalTotal}
        advanceAmount={safeAdvanceAmount}
        workStartDate={workStartDate}
        workEndDate={workEndDate}
        specifications={specifications}
        quoteConfig={quoteConfig}
        signatureUrl={signatureUrl}
        stampUrl={stampUrl}
        templateId={resolvedTemplateId}
      />
    );
    const blob = await pdf(contractDoc).toBlob();
    return { blob, fileName: `Договор_${baseName}_${format(contractDate, 'dd.MM.yyyy')}.pdf` };
  };

  const handleGenerateZip = () => {
    startGenerating(async () => {
      try {
        if (!projects.length) {
          toast({ title: 'Нет проектов', description: 'Группа пуста.', variant: 'destructive' });
          return;
        }
        const contractor = companies.find(c => c.id === contractorId);
        const client = companies.find(c => c.id === clientId);
        if (!contractor) {
          toast({ title: 'Не выбрана компания', description: 'Выберите исполнителя.', variant: 'destructive' });
          return;
        }

        const needsClientFor = (type: DocumentType) => ['invoice', 'contract', 'act', 'ks2', 'ks3', 'ks6a'].includes(type);
        const requiresClient = exportMode === 'combined'
          ? needsClientFor(docType)
          : (zipMode === 'multiDoc'
            ? selectedDocTypes.some(needsClientFor)
            : needsClientFor(docType));

        if (requiresClient && !client) {
          toast({ title: 'Не выбран клиент', description: 'Выберите клиента для документа.', variant: 'destructive' });
          return;
        }

        let signatureUrl = user?.signatureUrl || null;
        let stampUrl = user?.stampUrl || null;
        const signatureBuffer = signatureUrl ? await fetchImageBuffer(signatureUrl) : null;
        const stampBuffer = stampUrl ? await fetchImageBuffer(stampUrl) : null;

        if (exportMode === 'combined') {
          const fileData = await generateCombinedFile(docType, formatType, contractor, client || undefined);
          if (fileData) {
            saveAs(fileData.blob, fileData.fileName);
            toast({ title: 'Файл готов', description: 'Документ сформирован.' });
            onClose();
          }
          return;
        }

        if (zipMode === 'multiDoc') {
          const zip = new JSZip();
          const types = selectedDocTypes.length ? selectedDocTypes : ['proposal'];
          for (const type of types) {
            const fileData = await generateCombinedFile(type, 'pdf', contractor, client || undefined);
            if (fileData) {
              zip.file(fileData.fileName, fileData.blob);
            }
          }
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const archiveName = `Группа_${groupName}_документы.zip`;
          saveAs(zipBlob, archiveName);
          toast({ title: 'ZIP готов', description: `Сформировано файлов: ${types.length}.` });
          onClose();
          return;
        }

        const zip = new JSZip();
        for (let index = 0; index < projects.length; index += 1) {
          const project = projects[index];
          const fileData = await generateProjectFile(project, contractor, client || undefined, signatureUrl, stampUrl, signatureBuffer, stampBuffer, index);
          if (fileData) {
            zip.file(fileData.fileName, fileData.blob);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const archiveName = `Группа_${groupName}_${docType}.zip`;
        saveAs(zipBlob, archiveName);
        toast({ title: 'ZIP готов', description: `Сформирован архив на ${projects.length} проектов.` });
        onClose();
      } catch (error: any) {
        console.error('Group export error:', error);
        toast({ title: 'Ошибка выгрузки', description: error?.message || 'Не удалось сформировать архив.', variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Выгрузка группы</DialogTitle>
          <DialogDescription>Объедините вкладки в один файл или соберите ZIP с документами.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Режим выгрузки</Label>
            <RadioGroup value={exportMode} onValueChange={(value) => setExportMode(value as ExportMode)} className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="combined" id="group-export-combined" />
                <Label htmlFor="group-export-combined">Один файл</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="zip" id="group-export-zip" />
                <Label htmlFor="group-export-zip">ZIP документов</Label>
              </div>
            </RadioGroup>
          </div>

          {exportMode === 'zip' && (
            <div className="space-y-2">
              <Label>Содержимое ZIP</Label>
              <RadioGroup value={zipMode} onValueChange={(value) => setZipMode(value as ZipMode)} className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="perProject" id="zip-mode-projects" />
                  <Label htmlFor="zip-mode-projects">По проектам</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiDoc" id="zip-mode-multidoc" />
                  <Label htmlFor="zip-mode-multidoc">Набор документов</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {(exportMode === 'combined' || (exportMode === 'zip' && zipMode === 'perProject')) && (
            <div className="space-y-2">
              <Label>Тип документа</Label>
              <RadioGroup value={docType} onValueChange={(value) => handleDocTypeChange(value as DocumentType)} className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="proposal" id="zip-doc-proposal" />
                  <Label htmlFor="zip-doc-proposal">КП</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contract" id="zip-doc-contract" />
                  <Label htmlFor="zip-doc-contract">Договор</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="invoice" id="zip-doc-invoice" />
                  <Label htmlFor="zip-doc-invoice">Счет</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {exportMode === 'zip' && zipMode === 'multiDoc' && (
            <div className="space-y-2">
              <Label>Документы в архиве</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['proposal', 'contract', 'invoice'].map((value) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`zip-doc-${value}`}
                      checked={selectedDocTypes.includes(value as DocumentType)}
                      onCheckedChange={() => toggleDocTypeSelection(value as DocumentType)}
                    />
                    <Label htmlFor={`zip-doc-${value}`} className="text-sm">
                      {value === 'proposal' ? 'КП' : value === 'contract' ? 'Договор' : 'Счет'}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">Формат: PDF. Формируем единые документы по всей группе.</div>
            </div>
          )}

          {(exportMode === 'combined' || (exportMode === 'zip' && zipMode === 'perProject')) && (
            <div className="space-y-2">
              <Label>Формат</Label>
              <RadioGroup
                value={formatType}
                onValueChange={(value) => setFormatType(value as FileFormat)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="zip-format-pdf" />
                  <Label htmlFor="zip-format-pdf">PDF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="docx" id="zip-format-docx" disabled={!allowDocx} />
                  <Label htmlFor="zip-format-docx" className={!allowDocx ? 'text-muted-foreground' : ''}>DOCX</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="xlsx" id="zip-format-xlsx" disabled={!allowXlsx} />
                  <Label htmlFor="zip-format-xlsx" className={!allowXlsx ? 'text-muted-foreground' : ''}>XLSX</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Исполнитель</Label>
              <Select value={contractorId} onValueChange={setContractorId}>
                <SelectTrigger><SelectValue placeholder="Выберите компанию" /></SelectTrigger>
                <SelectContent>
                  {companies.filter(c => !c.isClient).map(company => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {((exportMode === 'zip' && zipMode === 'multiDoc' && (invoiceActive || contractActive)) || (exportMode !== 'zip' && (docType === 'invoice' || docType === 'contract'))) && (
              <div className="space-y-2">
                <Label>Клиент</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Выберите клиента" /></SelectTrigger>
                  <SelectContent>
                    {companies.filter(c => c.isClient).map(company => (
                      <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {showInvoiceSettings && (
            <div className="space-y-2">
              <Label>Тип счета</Label>
              <RadioGroup value={invoiceKind} onValueChange={(value) => setInvoiceKind(value as 'advance' | 'final')} className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="advance" id="zip-invoice-advance" />
                  <Label htmlFor="zip-invoice-advance">Авансовый</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="final" id="zip-invoice-final" />
                  <Label htmlFor="zip-invoice-final">Финальный</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {((invoiceActive && invoiceKind === 'advance') || contractActive) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Аванс</Label>
                <Select value={advanceType} onValueChange={(value) => setAdvanceType(value as 'percent' | 'fixed')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Процент</SelectItem>
                    <SelectItem value="fixed">Фиксированная сумма</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Значение</Label>
                <Input
                  type="number"
                  min="0"
                  value={advanceValue}
                  onChange={(e) => setAdvanceValue(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {showAdvanceSettings && (
            <div className="space-y-2">
              <Label>Основание</Label>
              <RadioGroup value={advanceBasis} onValueChange={(value) => setAdvanceBasis(value as 'project' | 'contract')} className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="project" id="zip-adv-basis-project" />
                  <Label htmlFor="zip-adv-basis-project">Проект(ы)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contract" id="zip-adv-basis-contract" />
                  <Label htmlFor="zip-adv-basis-contract">Договор</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {showContractBasisMeta && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Номер договора</Label>
                  <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Дата договора</Label>
                  <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Формулировка основания</Label>
                <Input value={contractBasisText} onChange={(e) => setContractBasisText(e.target.value)} />
              </div>
            </div>
          )}

          {templateOptions.length > 0 && !(exportMode === 'zip' && zipMode === 'multiDoc') && (
            <div className="space-y-2">
              <Label>Шаблон</Label>
              <Select value={resolvedTemplateId} onValueChange={setActiveTemplateId}>
                <SelectTrigger><SelectValue placeholder="Выберите шаблон" /></SelectTrigger>
                <SelectContent>
                  {templateOptions.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>Отмена</Button>
          <Button onClick={handleGenerateZip} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Сформировать ZIP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
