// src/components/DocumentGenerationDialog.tsx
"use client";

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Download, Send, FileText, FileSpreadsheet, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, type HistoryRequest, type QuoteConfig, type Company } from '@/contexts/AppContext';
import { generateDocx } from '@/services/docxGenerator';
import { generateExcel } from '@/services/excelGenerator';
import DocumentTemplate from '@/components/pdf/DocumentTemplate';
import InvoiceTemplate from '@/components/pdf/InvoiceTemplate';
import ContractTemplate from '@/components/pdf/ContractTemplate';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { sendFileToTelegramUser } from '@/actions/telegramActions';
import { calculateProjectTotals } from '@/lib/calculation';
import { CompanyFormDialog } from './CompanyFormDialog';
import { addDoc, collection, serverTimestamp } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import axios from 'axios';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

type DocumentType = 'proposal' | 'invoice' | 'contract';
type FileFormat = 'pdf' | 'docx' | 'xlsx';

interface DocumentGenerationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    project: HistoryRequest | null;
    specifications: any[];
    quoteConfig: QuoteConfig;
    companies: Company[];
}

export function DocumentGenerationDialog({ isOpen, onClose, project, specifications, quoteConfig, companies }: DocumentGenerationDialogProps) {
    const { user, telegram } = useAppContext();
    const { toast } = useToast();
    const [isGenerating, startGenerating] = useTransition();

    const [docType, setDocType] = useState<DocumentType>('proposal');
    const [contractorId, setContractorId] = useState<string>(companies.find(c => c.isDefault && !c.isClient)?.id || companies.find(c => !c.isClient)?.id || '');
    const [clientId, setClientId] = useState<string>(companies.find(c => c.isDefault && c.isClient)?.id || companies.find(c => c.isClient)?.id || '');
    const [advanceType, setAdvanceType] = useState<'percent' | 'fixed'>('percent');
    const [advanceValue, setAdvanceValue] = useState<number>(30);
    const [isClientFormOpen, setIsClientFormOpen] = useState(false);

    const { finalTotal } = calculateProjectTotals(specifications, quoteConfig);
    const advanceAmount = advanceType === 'percent' ? finalTotal * (advanceValue / 100) : advanceValue;
    const safeAdvanceAmount = Number.isFinite(advanceAmount) ? advanceAmount : 0;

    const generateFile = async (format: FileFormat): Promise<{ blob: Blob, fileName: string } | null> => {
        const contractor = companies.find(c => c.id === contractorId);
        const client = companies.find(c => c.id === clientId);

        if (!contractor || !project) return null;

        let blob: Blob;
        let fileName = `${project.analysisDetails?.objectName || project.fileName || 'проект'}`;
        const docParams = {
            company: contractor,
            specifications,
            analysisDetails: project.analysisDetails,
            quoteConfig,
            totals: calculateProjectTotals(specifications, quoteConfig),
        };

        switch (docType) {
            case 'invoice':
                if (!client) {
                    toast({ title: "Клиент не выбран", variant: "destructive" });
                    return null;
                }
                const invoiceNumber = `СЧ-${Date.now()}`;
                const invoiceDate = new Date();
                const invoiceDoc = (
                    <InvoiceTemplate
                        invoiceNumber={invoiceNumber}
                        invoiceDate={invoiceDate}
                        seller={contractor}
                        buyer={client}
                        items={[{ name: 'Авансовый платеж по договору', quantity: 1, unit: 'усл', price: safeAdvanceAmount }]}
                    />
                );
                blob = await pdf(invoiceDoc).toBlob();
                fileName = `Счет_${invoiceNumber}_от_${format(invoiceDate, 'dd.MM.yyyy')}.pdf`;
                
                 try {
                    const presignedUrlResponse = await fetch("/api/s3-upload", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fileName, fileType: blob.type }),
                    });
                    if (!presignedUrlResponse.ok) {
                        throw new Error((await presignedUrlResponse.json()).error || "Не удалось получить ссылку для загрузки в S3.");
                    }
                    const { uploadUrl, accessUrl } = await presignedUrlResponse.json();
                    await axios.put(uploadUrl, blob, { headers: { 'Content-Type': blob.type } });
                    const fileUri = accessUrl;

                    await addDoc(collection(db, 'invoices'), {
                        userId: user!.uid,
                        projectId: project.id,
                        invoiceNumber,
                        invoiceDate: serverTimestamp(),
                        buyerName: client.name,
                        totalAmount: safeAdvanceAmount,
                        downloadUrl: fileUri,
                        status: 'Ожидает оплаты'
                    });
                } catch(e) { console.error("Failed to save invoice to S3/DB", e); }

                break;
            case 'contract':
                if (!client) {
                    toast({ title: "Клиент не выбран", variant: "destructive" });
                    return null;
                }
                const contractNumber = `ДОГ-${Date.now()}`;
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
                        totalAmount={finalTotal}
                        advanceAmount={safeAdvanceAmount}
                        workStartDate={workStartDate}
                        workEndDate={workEndDate}
                        specifications={specifications}
                        quoteConfig={quoteConfig}
                    />
                );
                blob = await pdf(contractDoc).toBlob();
                fileName = `Договор_${contractNumber}_от_${format(contractDate, 'dd.MM.yyyy')}.pdf`;
                break;
            case 'proposal':
            default:
                if (format === 'docx') {
                    blob = await generateDocx(docParams as any);
                    fileName = `КП_${fileName}.docx`;
                } else if (format === 'xlsx') {
                    blob = await generateExcel(docParams as any);
                    fileName = `КП_${fileName}.xlsx`;
                } else {
                    const pdfDoc = <DocumentTemplate {...docParams} />;
                    blob = await pdf(pdfDoc).toBlob();
                    fileName = `КП_${fileName}.pdf`;
                }
                break;
        }

        return { blob, fileName };
    };

    const handleDownload = async (format: FileFormat) => {
        startGenerating(async () => {
            toast({ title: `Генерация ${format.toUpperCase()}...`, description: "Пожалуйста, подождите." });
            try {
                const fileData = await generateFile(format);
                if (fileData) saveAs(fileData.blob, fileData.fileName);
            } catch (error) {
                console.error("Download Error:", error);
                toast({ title: "Ошибка генерации", description: "Не удалось создать файл.", variant: "destructive" });
            }
        });
    };
    
    const handleSendToBot = async (format: FileFormat) => {
        if (!user?.telegramChatId) {
            toast({ title: "Telegram не привязан", description: "Привяжите аккаунт Telegram в профиле.", variant: "destructive" });
            return;
        }
        startGenerating(async () => {
            try {
                const fileData = await generateFile(format);
                if (!fileData) throw new Error("Не удалось создать файл.");
                const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(fileData.blob);
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });
                const result = await sendFileToTelegramUser({ fileData: base64Data, fileName: fileData.fileName, fileMime: fileData.blob.type, chatId: user.telegramChatId });
                if (!result.success) throw new Error(result.message);
                toast({ title: "Успех", description: `Файл ${format.toUpperCase()} отправлен в Telegram.` });
            } catch (error: any) {
                toast({ title: "Ошибка отправки", description: error.message, variant: "destructive" });
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <Label>Тип документа</Label>
                                <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="proposal">Коммерческое предложение</SelectItem>
                                        <SelectItem value="invoice">Счет на аванс</SelectItem>
                                        <SelectItem value="contract">Договор подряда</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
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
                             {(docType === 'invoice' || docType === 'contract') && (
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

                        {docType === 'invoice' && (
                             <div className="space-y-2 pt-2">
                                <Label>Параметры аванса</Label>
                                <div className="flex items-center gap-4">
                                    <RadioGroup value={advanceType} onValueChange={(v) => setAdvanceType(v as any)} className="flex">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="percent" id="adv-p"/> <Label htmlFor="adv-p">Процент</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="fixed" id="adv-f"/> <Label htmlFor="adv-f">Фикс. сумма</Label></div>
                                    </RadioGroup>
                                    <Input type="number" value={advanceValue} onChange={e => setAdvanceValue(Number(e.target.value))} className="w-32"/>
                                    <div className="text-sm text-muted-foreground">= {advanceAmount.toLocaleString('ru-RU')} ₽</div>
                                </div>
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
                                <DropdownMenuItem onSelect={() => handleDownload('docx')}><FileText className="mr-2 h-4 w-4"/>DOCX</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDownload('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4"/>Excel</DropdownMenuItem>
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
