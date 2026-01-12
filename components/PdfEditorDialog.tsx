// src/components/PdfEditorDialog.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, FileText, CheckSquare, Square, Library, TextCursorInput } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface PdfEditorDialogProps {
  file: File;
  onClose: () => void;
  onProcess: (editedFile: File) => void;
}

export function PdfEditorDialog({ file, onClose, onProcess }: PdfEditorDialogProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pagePreviews, setPagePreviews] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [manualInputError, setManualInputError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadPdf = useCallback(async (pdfFile: File) => {
    setIsLoading(true);
    setPagePreviews([]); // Clear old previews
    try {
      if (pdfFile.type !== 'application/pdf') {
        throw new Error("Для редактирования поддерживаются только PDF файлы.");
      }
      const arrayBuffer = await pdfFile.arrayBuffer();
      const doc = await PDFDocument.load(arrayBuffer);
      setPdfDoc(doc);
      
      const pageCount = doc.getPageCount();
      const initialSelected = new Set(Array.from({ length: pageCount }, (_, i) => i));
      setSelectedPages(initialSelected);

    } catch (error: any) {
      console.error("Failed to load PDF:", error);
      toast({
        title: "Ошибка загрузки PDF",
        description: error.message || "Не удалось прочитать файл. Возможно, он поврежден или имеет неподдерживаемый формат.",
        variant: "destructive",
      });
      onClose();
    } 
    // We will set loading to false after previews are generated
  }, [toast, onClose]);

  useEffect(() => {
    if (file) {
      loadPdf(file);
    }
  }, [file, loadPdf]);
  
  useEffect(() => {
    if (!pdfDoc) return;

    const generatePreviews = async () => {
        setIsLoading(true);
        try {
            const previews: string[] = [];
            const pageIndices = pdfDoc.getPageIndices();
            for (const pageIndex of pageIndices) {
                // Create a new document for each page preview.
                // This is memory-intensive but reliable for rendering.
                const tempDoc = await PDFDocument.create();
                const [copiedPage] = await tempDoc.copyPages(pdfDoc, [pageIndex]);
                tempDoc.addPage(copiedPage);
                const dataUri = await tempDoc.saveAsBase64({ dataUri: true });
                previews.push(dataUri);
            }
            setPagePreviews(previews);
        } catch (error) {
            console.error("Failed to generate PDF previews:", error);
            toast({ title: "Не удалось загрузить превью", description: "Произошла ошибка при генерации изображений страниц.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    generatePreviews();
  }, [pdfDoc, toast]);


  const handlePageSelection = (pageIndex: number, isSelected: boolean) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(pageIndex);
      else newSet.delete(pageIndex);
      return newSet;
    });
  };

  const selectAll = () => {
    if (!pdfDoc) return;
    const allPages = new Set(Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i));
    setSelectedPages(allPages);
  };

  const invertSelection = () => {
    if (!pdfDoc) return;
    const allPages = new Set(Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i));
    setSelectedPages(prev => {
        const newSet = new Set(allPages);
        prev.forEach(page => newSet.delete(page));
        return newSet;
    });
  };
  
  useEffect(() => {
    // Sync manual input from visual selection
    if (!pdfDoc) return;

    const ranges: string[] = [];
    const sorted = Array.from(selectedPages).sort((a,b) => a - b);
    if (sorted.length === 0) {
        setManualInput('');
        return;
    }

    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) {
            end = sorted[i];
        } else {
            ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
            start = sorted[i];
            end = sorted[i];
        }
    }
    ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
    setManualInput(ranges.join(', '));
    setManualInputError(null);
  }, [selectedPages, pdfDoc]);
  
  const applyManualSelection = () => {
    if (!pdfDoc) return;
    setManualInputError(null);
    const newSelected = new Set<number>();
    const pageCount = pdfDoc.getPageCount();

    const parts = manualInput.split(',').map(p => p.trim()).filter(p => p);
    try {
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > pageCount) throw new Error(`Неверный диапазон: ${part}`);
                for (let i = start; i <= end; i++) {
                    newSelected.add(i - 1);
                }
            } else {
                const num = Number(part);
                 if (isNaN(num) || num < 1 || num > pageCount) throw new Error(`Неверный номер страницы: ${part}`);
                newSelected.add(num - 1);
            }
        }
        setSelectedPages(newSelected);
        toast({ title: 'Выделение обновлено', description: `Выбрано ${newSelected.size} страниц.`});
    } catch (e: any) {
        setManualInputError(e.message);
    }
  }


  const handleProcess = async () => {
    if (!pdfDoc || selectedPages.size === 0) {
      toast({ title: "Не выбраны страницы", description: "Пожалуйста, выберите хотя бы одну страницу для анализа.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const newPdfDoc = await PDFDocument.create();
      const pagesToKeep = Array.from(selectedPages).sort((a, b) => a - b);
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToKeep);
      copiedPages.forEach(page => newPdfDoc.addPage(page));

      const newPdfBytes = await newPdfDoc.save();
      const newFile = new File([newPdfBytes], `edited_${file.name}`, { type: 'application/pdf' });
      
      onProcess(newFile);

    } catch (error) {
      console.error("Failed to process PDF:", error);
      toast({ title: "Ошибка обработки PDF", description: "Не удалось сохранить изменения в файле.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const pagesToDeleteCount = (pdfDoc?.getPageCount() ?? 0) - selectedPages.size;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Редактор PDF</DialogTitle>
          <DialogDescription>
            Файл может быть слишком большим для прямого анализа. Удалите ненужные страницы, чтобы уменьшить его размер.
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="default" className="bg-amber-50 border-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 font-semibold">Рекомендация</AlertTitle>
            <AlertDescription className="text-amber-700">
                ИИ анализирует только текст. Для уменьшения размера файла рекомендуется удалить страницы со схемами, планами этажей и чертежами.
            </AlertDescription>
        </Alert>

        <div className="flex flex-wrap items-center gap-2">
            <Button onClick={selectAll} variant="outline" size="sm"><CheckSquare className="mr-2"/>Выделить все</Button>
            <Button onClick={invertSelection} variant="outline" size="sm"><Library className="mr-2"/>Инвертировать</Button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col justify-center items-center">
            <Loader2 className="h-12 w-12 animate-spin mb-4" />
            <p>Загрузка превью страниц...</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 border rounded-md">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
              {pagePreviews.map((previewDataUri, index) => (
                <div key={index} className="relative border-2 rounded-lg overflow-hidden group cursor-pointer" onClick={() => handlePageSelection(index, !selectedPages.has(index))}>
                   <iframe src={`${previewDataUri}#view=FitH&toolbar=0&navpanes=0`} className="w-full h-auto aspect-[1/1.414] bg-white pointer-events-none" title={`Page ${index + 1}`} />
                  <div className={cn("absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center", selectedPages.has(index) ? "opacity-0" : "opacity-100")}>
                     <p className="text-white font-bold text-lg">ИСКЛЮЧЕНО</p>
                  </div>
                   <div className="absolute top-1 left-1">
                       <Checkbox
                            checked={selectedPages.has(index)}
                            className="h-6 w-6 border-white bg-black/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                   </div>
                   <div className="absolute bottom-1 right-1 bg-background/80 text-foreground px-1.5 py-0.5 text-xs rounded-sm">
                        {index + 1}
                    </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <Separator/>

        <Accordion type="single" collapsible>
            <AccordionItem value="manual-input">
                <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                        <TextCursorInput className="h-4 w-4" />
                        <span>Ручной ввод страниц</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="flex flex-col gap-2 pt-2">
                        <Label htmlFor="manual-input-textarea" className="text-xs text-muted-foreground">Введите номера страниц и диапазоны через запятую (например: 1-5, 8, 10-12).</Label>
                        <Textarea
                            id="manual-input-textarea"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            placeholder="1-5, 8, 10-12"
                            className="font-mono h-24"
                        />
                        {manualInputError && <p className="text-sm text-destructive">{manualInputError}</p>}
                        <Button onClick={applyManualSelection} className="self-start" size="sm">Применить ручной ввод</Button>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>


        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
          <div className="flex-1 text-center sm:text-left text-sm text-muted-foreground">
             {pdfDoc && (
                <span>
                    Выбрано {selectedPages.size} из {pdfDoc.getPageCount()} страниц. 
                    {pagesToDeleteCount > 0 && ` Будет удалено: ${pagesToDeleteCount}.`}
                </span>
             )}
          </div>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Отмена</Button>
          <Button onClick={handleProcess} disabled={isLoading || isProcessing || selectedPages.size === 0}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Обработать и запустить анализ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
