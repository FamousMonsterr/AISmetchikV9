// src/app/dashboard/page.tsx
"use client";

import {
  FileUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { ProcessingDialog } from "@/components/ProcessingDialog";
import { PdfEditorDialog } from '@/components/PdfEditorDialog';
import { HistorySection } from '@/components/dashboard/HistorySection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, AppWindow } from 'lucide-react';
import { InsufficientCreditsDialog } from '@/components/InsufficientCreditsDialog';
import { getPendingFile, deletePendingFile } from '@/lib/pwa-helpers';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { GlassButton } from "@/components/ui/glass-button";
import { PlanBadge } from "@/components/PlanBadge";
import { PlanModelPreference } from "@/components/PlanModelPreference";
import { getModelLabel, resolvePlanModelId } from "@/lib/plan-models";


const LARGE_FILE_THRESHOLD_MB = 50; // 5 MB threshold for PDF editor

const PwaPrompt = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const isAndroid = /android/i.test(navigator.userAgent);
        const isPwa = window.matchMedia('(display-mode: standalone)').matches;

        // Show prompt only on Android if it's not already a PWA
        // and the user hasn't dismissed it this session.
        if (isAndroid && !isPwa && !sessionStorage.getItem('pwa-prompt-dismissed')) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <Alert className="mb-6">
            <AppWindow className="h-4 w-4" />
            <AlertTitle>Установите приложение!</AlertTitle>
            <AlertDescription>
                Установите EstimateAI на главный экран, чтобы отправлять файлы на анализ напрямую из WhatsApp, Telegram или Почты через меню "Поделиться".
                <div className="mt-2 text-xs">
                  (Нажмите "Меню" в браузере → "Установить приложение")
                </div>
            </AlertDescription>
             <button onClick={handleDismiss} className="absolute top-2 right-2 text-muted-foreground">&times;</button>
        </Alert>
    );
};


export default function DashboardPage() {
  const {
    user,
    userAvailableModels, // Plan-based models from context
    effectivePlan,
  } = useAppContext();
  const { toast } = useToast();
  
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPdfEditorOpen, setIsPdfEditorOpen] = useState(false);
  
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
  

  // PWA Share Target Handling
  useEffect(() => {
    const handleSharedFile = async () => {
        if (!user) return; // Only process if user is logged in
        const urlParams = new URLSearchParams(window.location.search);
        const shareReceived = urlParams.get('share-received') === 'true';

        if (shareReceived) {
            try {
                const pendingFile = await getPendingFile();
                if (pendingFile) {
                    toast({ title: "Файл получен", description: `Готовим к анализу: ${pendingFile.name}` });
                    setSelectedFile(pendingFile);
                    await deletePendingFile(); // Clean up after retrieving
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } catch (error) {
                console.error("Error handling shared file:", error);
                toast({ title: "Ошибка", description: "Не удалось обработать полученный файл.", variant: "destructive" });
            }
        }
    };
    if (user) { // Wait for user to be loaded
        handleSharedFile();
    }
  }, [user, toast]);

  
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('showWelcomeModal') === 'true') {
        setShowWelcomeModal(true);
        localStorage.removeItem('showWelcomeModal');
    }
  }, []);

  const [selectedModel, setSelectedModel] = useState<string>('');
  const canSelectModel = effectivePlan === 'Business' || effectivePlan === 'Enterprise';
  const planKey = effectivePlan === 'PRO' ? 'pro' : 'free';
  const preference = user?.planModelPreferences?.[planKey];
  const resolvedModel = useMemo(() => resolvePlanModelId(effectivePlan, preference), [effectivePlan, preference]);

  useEffect(() => {
    if (!userAvailableModels.length) {
      setSelectedModel(resolvedModel || '');
      return;
    }
    if (!canSelectModel) {
      setSelectedModel(resolvedModel || '');
      return;
    }
    const currentModelIsValid = userAvailableModels.some((model: any) => model.value === selectedModel);
    if (!currentModelIsValid) {
      const defaultModel = userAvailableModels.find((model: any) => model.isDefault) || userAvailableModels[0];
      if (defaultModel) {
        setSelectedModel(defaultModel.value);
      }
    }
  }, [userAvailableModels, selectedModel, canSelectModel, resolvedModel]);

  const activeModel = canSelectModel ? (selectedModel || resolvedModel) : resolvedModel;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      toast({ title: "Файл выбран", description: file.name });
      
       if (file.type === 'application/pdf' && file.size > LARGE_FILE_THRESHOLD_MB * 1024 * 1024) {
          setIsPdfEditorOpen(true);
      }
    }
  }, [toast]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });
  
  const handleStartAnalysis = (fileToProcess: File) => {
    if (!fileToProcess) return;
     // Check credits before opening the dialog
    if (user && (user.credits || 0) < 1) {
      setIsCreditsDialogOpen(true);
      return;
    }
    setIsProcessingDialogOpen(true);
  }
  

  return (
    <div className="w-full">
    {/* All Dialogs */}
     <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent>
          <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-primary"/>
                  Добро пожаловать в EstimateAI!
              </DialogTitle>
              <DialogDescription>
                  Рады видеть вас! Вот краткая инструкция для начала работы.
              </DialogDescription>
          </DialogHeader>
          <div className="py-4 prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {`1.  **Загрузите документ:** Перетащите PDF-файл, скан или фото со спецификацией в поле "Анализ файла".
2.  **Дождитесь анализа:** Наш AI проанализирует документ и создаст таблицу с позициями.
3.  **Отредактируйте и оцените:** Вы будете перенаправлены на страницу спецификации, где сможете внести правки, указать цены и сформировать коммерческое предложение.`}
            </ReactMarkdown>
          </div>
          <DialogFooter>
              <Button onClick={() => setShowWelcomeModal(false)}>Начать работу</Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>

    <InsufficientCreditsDialog isOpen={isCreditsDialogOpen} onClose={() => setIsCreditsDialogOpen(false)} />

    {isProcessingDialogOpen && selectedFile && (
         <ProcessingDialog
            isOpen={isProcessingDialogOpen}
            file={selectedFile}
            model={activeModel}
            onClose={() => setIsProcessingDialogOpen(false)}
        />
    )}
     {selectedFile && isPdfEditorOpen && (
        <PdfEditorDialog
            file={selectedFile}
            onClose={() => setIsPdfEditorOpen(false)}
            onProcess={(editedFile) => {
                setSelectedFile(editedFile);
                setIsPdfEditorOpen(false);
                toast({ title: "Файл отредактирован", description: "Теперь можно запускать анализ." });
            }}
        />
    )}

    {/* Main Page Content */}
    <div className="flex flex-col h-full space-y-6">
      <PwaPrompt />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-card/50">
            <CardHeader>
                <CardTitle>Новый расчет</CardTitle>
                <CardDescription>Загрузите файл для AI-анализа</CardDescription>
            </CardHeader>
            <CardContent>
                <div {...getRootProps()} onClick={(e) => { e.stopPropagation(); (e.currentTarget.querySelector('input') as HTMLElement)?.click();}} className="p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors border-input hover:border-primary/50">
                    <input {...getInputProps()} />
                    <FileUp className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    {selectedFile ? (
                        <p className="font-semibold text-primary truncate max-w-[80%] mx-auto" title={selectedFile.name}>{selectedFile.name}</p>
                    ) : (
                        <>
                            <h3 className="font-semibold">Перетащите файл или <span className="text-primary hover:underline">нажмите для выбора</span></h3>
                            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG</p>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
         <Card className="bg-card/50 flex flex-col">
            <CardHeader>
                <CardTitle>Настройки анализа</CardTitle>
                <CardDescription>
                    {canSelectModel
                      ? 'Выберите модель и параметры для обработки'
                      : 'Модель определяется тарифом. При A/B тесте можно выбрать предпочтительный вариант.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
                 <div className="space-y-2">
                     <Label>AI Модель</Label>
                    {canSelectModel ? (
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите модель AI..." />
                            </SelectTrigger>
                            <SelectContent>
                                {userAvailableModels.length > 0 ? (
                                    userAvailableModels.map((model: any) => (
                                        <SelectItem key={model.value} value={model.value}>
                                            {model.label}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="no-models" disabled>
                                        Модели не доступны
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <span className="text-muted-foreground">
                                {getModelLabel(activeModel) || 'Модель определяется тарифом'}
                            </span>
                            <PlanBadge plan="Business" size="xs" />
                        </div>
                    )}
                 </div>
                 <PlanModelPreference />
            </CardContent>
            <CardFooter>
                 <GlassButton onClick={() => selectedFile && handleStartAnalysis(selectedFile)} className="w-full" disabled={!selectedFile || isProcessingDialogOpen} icon={<Sparkles className="mr-2 h-4 w-4"/>}>
                    Анализ Файла
                </GlassButton>
            </CardFooter>
        </Card>
      </div>
      
      {/* History Section */}
      <HistorySection />

    </div>
    </div>
  );
}
