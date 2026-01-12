// src/components/AIProcessingDialog.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, Download, Send, Bot, FileText, Code, Server, MessageSquare } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Textarea } from './ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type FileFormat = 'pdf' | 'docx' | 'xlsx';

interface Stage {
    key: string;
    text: string;
}

interface AIResponse {
    success: boolean;
    message: string;
    rawResponse?: any;
    requestDetails?: {
        prompt: string;
        model: string;
        provider: string;
        baseUrl: string;
    };
}


interface AIProcessingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  stages: Stage[];
  result: AIResponse | null;
  currentStage?: string;
  onDownload?: (format: FileFormat) => void;
  onSendToBot?: (format: FileFormat) => void;
  onApplyResponse?: (rawResponse: any) => void;
}

export function AIProcessingDialog({
  isOpen,
  onClose,
  title,
  description,
  stages,
  result,
  currentStage,
  onDownload,
  onSendToBot,
  onApplyResponse,
}: AIProcessingDialogProps) {

  const isProcessing = !result;
  const currentStageIndex = currentStage ? stages.findIndex(s => s.key === currentStage) : -1;
  const showApplyButton = result?.success && typeof onApplyResponse === 'function';
  const showExportButtons = result?.success && onDownload && onSendToBot;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => { if (isProcessing) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {result ? (
            <div className={cn("p-4 border rounded-lg", result.success ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800")}>
              <div className="flex items-center gap-2">
                {result.success ? <CheckCircle className="h-5 w-5 text-green-600"/> : <AlertTriangle className="h-5 w-5 text-red-600"/>}
                <p className={cn("font-semibold", result.success ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300")}>
                  {result.success ? 'Успешно' : 'Ошибка'}
                </p>
              </div>
              <p className={cn("mt-2 text-sm", result.success ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
                {result.message}
              </p>

              {(result.rawResponse || result.requestDetails) && (
                 <Accordion type="multiple" className="w-full mt-4">
                    {result.requestDetails && (
                        <AccordionItem value="request">
                            <AccordionTrigger className="text-xs">Посмотреть запрос к AI</AccordionTrigger>
                            <AccordionContent>
                                <Textarea readOnly value={result.requestDetails.prompt} className="h-40 text-xs font-mono bg-background/50" />
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {result.rawResponse && (
                        <AccordionItem value="response">
                            <AccordionTrigger className="text-xs">Посмотреть ответ от AI (raw)</AccordionTrigger>
                            <AccordionContent>
                                <Textarea readOnly value={typeof result.rawResponse === 'string' ? result.rawResponse : JSON.stringify(result.rawResponse, null, 2)} className="h-40 text-xs font-mono bg-background/50" />
                            </AccordionContent>
                        </AccordionItem>
                    )}
                     {result.requestDetails && (
                        <AccordionItem value="params">
                            <AccordionTrigger className="text-xs">Параметры вызова</AccordionTrigger>
                            <AccordionContent className="text-xs space-y-1">
                                <p><strong className="font-semibold">Провайдер:</strong> {result.requestDetails.provider}</p>
                                <p><strong className="font-semibold">Модель:</strong> {result.requestDetails.model}</p>
                                <p className="truncate"><strong className="font-semibold">Endpoint:</strong> {result.requestDetails.baseUrl}</p>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                 </Accordion>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {stages.map((stage, index) => {
                const isDone = currentStageIndex > index;
                const isCurrent = currentStageIndex === index;
                return (
                  <div key={stage.key} className={cn("flex items-center gap-3 transition-all", isDone ? "text-green-600" : "text-muted-foreground", isCurrent && "text-primary font-semibold")}>
                    {isDone ? <CheckCircle className="h-5 w-5" /> : (isCurrent ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="h-5 w-5 rounded-full border-2 border-current" />)}
                    <span>{stage.text}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {showApplyButton ? (
            <>
              <Button variant="secondary" onClick={onClose}>Закрыть</Button>
              <Button onClick={() => onApplyResponse(result.rawResponse)}><Bot className="mr-2 h-4 w-4" />Применить ответ AI</Button>
            </>
          ) : showExportButtons ? (
             <>
              <Button variant="outline" onClick={() => onDownload('pdf')}><Download className="mr-2 h-4 w-4"/>PDF</Button>
              <Button variant="outline" onClick={() => onDownload('docx')}><FileText className="mr-2 h-4 w-4"/>DOCX</Button>
              <Button onClick={() => onSendToBot('pdf')}><Send className="mr-2 h-4 w-4"/>Telegram</Button>
              <Button onClick={onClose} variant="secondary">Закрыть</Button>
            </>
          ) : (
            <Button onClick={onClose} variant={isProcessing ? "ghost" : "outline"} disabled={isProcessing}>
                {isProcessing ? 'Пожалуйста, подождите...' : 'Закрыть'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}