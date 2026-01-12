// src/components/ProcessingDialog.tsx
"use client";

import { useState, useEffect, useRef, useMemo, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, Hash, Sparkles, Server, Database, GitCommit, Link as LinkIcon, UploadCloud, FileJson, RefreshCw, Download, Send, FileText, FileSpreadsheet, Bot, Code } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { useAppContext, type HistoryRequest, type QuoteConfig, initialQuoteConfig } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { InsufficientCreditsDialog } from './InsufficientCreditsDialog';
import { cn } from "@/lib/utils";
import { ScrollArea } from './ui/scroll-area';
import { hydrateSpecificationsForDB, getFileSha1 } from '@/lib/utils';
import { finalizeProjectCreation } from '@/actions/userActions';
import type { ExtractProjectSpecificationsOutput } from '@/ai/genkit-schemas';
import constructorConfig from '@/lib/ai-constructor-config.json';
import { Details } from './Details';
import axios from 'axios';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, updateDoc, increment } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { type PdfEngine } from '@/services/openrouter';
import aiConfig from '@/lib/ai-config.json';


const ANALYSIS_COST = 1;

type StageKey = 
    | 'idle' 
    | 'checking_credits' 
    | 'getting_hash'
    | 'checking_s3_cache'
    | 'checking_analysis_cache'
    | 'getting_s3_url'
    | 'uploading_to_s3'
    | 'preparing_request'
    | 'sending_request'
    | 'analyzing' 
    | 'processing_response'
    | 'saving' 
    | 'complete' 
    | 'error';

interface Stage {
    key: StageKey;
    text: string;
    icon: React.ElementType;
}

const stageInfo: Record<StageKey, Omit<Stage, 'key'>> = {
    idle: { text: 'Ожидание начала...', icon: Loader2 },
    checking_credits: { text: 'Проверка кредитов...', icon: Database },
    getting_hash: { text: 'Получение хеша файла...', icon: Hash },
    checking_s3_cache: { text: 'Проверка кеша S3...', icon: Server },
    checking_analysis_cache: { text: 'Проверка кеша анализа...', icon: Database },
    getting_s3_url: { text: 'Запрос ссылки для загрузки в S3...', icon: LinkIcon },
    uploading_to_s3: { text: 'Загрузка файла в хранилище...', icon: UploadCloud },
    preparing_request: { text: 'Формирование запроса в ИИ...', icon: FileJson },
    sending_request: { text: 'Отправка запроса в ИИ...', icon: Send },
    analyzing: { text: 'Ожидание ответа ИИ...', icon: Sparkles },
    processing_response: { text: 'Обработка ответа ИИ...', icon: Code },
    saving: { text: 'Сохранение проекта...', icon: Database },
    complete: { text: 'Анализ завершен!', icon: CheckCircle },
    error: { text: 'Произошла ошибка', icon: AlertTriangle },
};

interface ProcessingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  model: string;
  temperature?: number;
  includeThoughts?: boolean;
}

export function ProcessingDialog({ isOpen, onClose, file, model, temperature, includeThoughts }: ProcessingDialogProps) {
    const { user, setCurrentProject } = useAppContext();
    const { toast } = useToast();
    const router = useRouter();

    const [stage, setStage] = useState<StageKey>('idle');
    const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const processingStarted = useRef(false);
    
    const modelInfo = useMemo(() => aiConfig.apiModels.find(m => m.value === model), [model]);
    const isSelectedOpenRouter = modelInfo?.provider === 'openrouter';

    // Determine which engine will be used
    const effectivePdfEngine = useMemo(() => {
        if (!isSelectedOpenRouter || !file || file.type !== 'application/pdf') return 'N/A';
        const modelOverride = modelInfo?.pdfEngineOverride;
        if (modelOverride && modelOverride !== 'none') return modelOverride;
        return aiConfig.providers.openrouter.pdfProcessingPriority[0] || 'auto';
    }, [isSelectedOpenRouter, modelInfo, file]);


    const resetState = () => {
        setStage('idle');
        setErrorMessage(null);
        processingStarted.current = false;
    };

    useEffect(() => {
        if (!isOpen) {
            resetState();
            return;
        }
        if (processingStarted.current || !file) return;
        processingStarted.current = true;

        const processFile = async () => {
            let fileDataForApi: { fileUri: string; mimeType: string; fileName?: string } | undefined;
            let fileHash: string;

            const runAnalysis = async (promptId: string): Promise<ExtractProjectSpecificationsOutput> => {
                const promptConfig = constructorConfig.prompts.find(p => p.id === promptId);
                if (!promptConfig) throw new Error(`Prompt '${promptId}' not found.`);

                setStage('preparing_request');
                const missing: string[] = [];
                if (!promptConfig.promptText) missing.push('prompt');
                if (!model) missing.push('model');
                if (!user?.uid) missing.push('userId');
                if (fileDataForApi) {
                    if (!fileDataForApi.fileUri) missing.push('fileUri');
                    if (!fileDataForApi.mimeType) missing.push('mimeType');
                }
                if (missing.length) {
                    throw new Error(`Не удалось сформировать запрос: отсутствуют поля: ${missing.join(', ')}`);
                }

                const isPdf = fileDataForApi?.mimeType === 'application/pdf';
                const pdfEngineToUse = isPdf && isSelectedOpenRouter ? effectivePdfEngine : undefined;
                if (isPdf && isSelectedOpenRouter) {
                    toast({
                        title: "Плагины для PDF",
                        description: `Подключаем file-parser с engine: ${pdfEngineToUse || 'auto'}.`,
                    });
                }

                toast({
                    title: "Запрос в ИИ сформирован",
                    description: `Модель: ${model}. Файл: ${fileDataForApi?.fileName || file?.name || '—'}.`,
                });

                setStage('sending_request');
                const response = await fetch('/api/main-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: promptConfig.promptText,
                        file: fileDataForApi,
                        model, temperature, includeThoughts,
                        userId: user!.uid,
                        pdfEngine: pdfEngineToUse, // Pass the determined engine
                    }),
                });

                setStage('analyzing');
                const resultJson = await response.json();
                setStage('processing_response');

                if (!response.ok) {
                    throw new Error(resultJson.error || `Analysis request failed: ${response.status}.`);
                }
                
                return resultJson as ExtractProjectSpecificationsOutput;
            };

            const saveFinalResult = async (result: ExtractProjectSpecificationsOutput, hash: string, fileUri?: string) => {
                setStage('saving');
                const hydratedItems = hydrateSpecificationsForDB(result.items || []);
                const projectData: Omit<HistoryRequest, 'id' | 'userId' | 'timestamp'> = {
                    fileName: file.name, fileUri: fileUri, mimeType: file.type, fileSha1: hash,
                    modelUsed: model, cost: ANALYSIS_COST, status: 'success', isMainVersion: true, parentProjectId: null, version: 1, aiCallCount: 0,
                    outputSpecifications: hydratedItems, aiComment: result.aiComment, importantExtractionNotes: result.importantExtractionNotes,
                    analysisDetails: result.analysisDetails, quoteConfig: initialQuoteConfig,
                };
                const saveResult = await finalizeProjectCreation(user!.uid, projectData, ANALYSIS_COST, result);
                if (!saveResult.success || !saveResult.project) throw new Error(saveResult.message || "Не удалось сохранить проект.");

                setCurrentProject(saveResult.project);
                setStage('complete');
                toast({title: "Анализ завершен!", description: `Проект "${file.name}" успешно обработан и сохранен.`});
                onClose();
                router.push('/dashboard/calculator');
            }
            
            try {
                setStage('checking_credits');
                if (!user || (user.credits || 0) < ANALYSIS_COST) {
                    setIsCreditsDialogOpen(true);
                    onClose();
                    return;
                }

                setStage('getting_hash');
                fileHash = await getFileSha1(file);
                
                let fileUri: string | undefined;

                setStage('checking_s3_cache');
                const s3CacheRef = doc(db, 's3_file_cache', fileHash);
                const s3CacheSnap = await getDoc(s3CacheRef);

                if (s3CacheSnap.exists()) {
                    const data = s3CacheSnap.data();
                    const expirationDate = (() => {
                      const value = data.urlExpirationTimestamp;
                      if (!value) return null;
                      if (typeof value?.toDate === 'function') return value.toDate();
                      if (value instanceof Date) return value;
                      if (typeof value === 'number' || typeof value === 'string') return new Date(value);
                      return null;
                    })();
                    const isExpired = !expirationDate || expirationDate < new Date();
                    if (isExpired) {
                       toast({ title: "Ссылка на файл истекла", description: "Обновляем ссылку в S3 кеше." });
                       const refreshResponse = await fetch("/api/s3-refresh-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objectKey: data.objectKey }), });
                       if (!refreshResponse.ok) throw new Error("Не удалось обновить ссылку на S3 файл.");
                       const { newAccessUrl, newExpirationTimestamp } = await refreshResponse.json();
                       await updateDoc(s3CacheRef, { accessUrl: newAccessUrl, urlExpirationTimestamp: new Timestamp(Math.floor(newExpirationTimestamp / 1000), 0) });
                       fileUri = newAccessUrl;
                       toast({ title: "Ссылка обновлена", description: "Получена новая ссылка доступа к файлу." });
                    } else {
                       fileUri = data.accessUrl;
                       toast({ title: "Ссылка уже есть", description: "Используем актуальную ссылку из кеша." });
                    }
                } else {
                    toast({ title: "Ссылка не найдена", description: "Файла нет в кеше, нужна загрузка в S3." });
                    setStage('getting_s3_url');
                    const presignedUrlResponse = await fetch("/api/s3-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, fileType: file.type }) });
                    if (!presignedUrlResponse.ok) throw new Error((await presignedUrlResponse.json()).error || "Не удалось получить ссылку для загрузки в S3.");
                    const { uploadUrl, accessUrl, objectKey, urlExpirationTimestamp } = await presignedUrlResponse.json();

                    toast({ title: "Ссылка получена", description: "Ссылка для загрузки в S3 получена." });
                    setStage('uploading_to_s3');
                    await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });
                    toast({ title: "Файл загружен", description: "Файл загружен в S3 хранилище." });
                    
                    await setDoc(s3CacheRef, { fileSha1: fileHash, objectKey, accessUrl, urlExpirationTimestamp: new Timestamp(Math.floor(urlExpirationTimestamp/1000), 0), createdAt: serverTimestamp(), fileName: file.name });
                    toast({ title: "Ссылка сохранена", description: "Данные ссылки сохранены в кеше." });
                    fileUri = accessUrl;
                }
                
                setStage('checking_analysis_cache');
                const analysisCacheRef = doc(db, 'file_analysis_cache', fileHash);
                const analysisCacheSnap = await getDoc(analysisCacheRef);

                if (analysisCacheSnap.exists() && (analysisCacheSnap.data().reportCount || 0) < 3) {
                    toast({ title: "Найден кеш анализа!", description: "Результат взят из кеша." });
                    const cachedData = analysisCacheSnap.data().originalAiResponse as ExtractProjectSpecificationsOutput;
                    await saveFinalResult(cachedData, fileHash, fileUri);
                    return;
                }

                if (!fileUri) {
                    throw new Error("Не удалось получить ссылку на файл в S3.");
                }
                fileDataForApi = { fileUri: fileUri, mimeType: file.type, fileName: file.name };


                setStage('preparing_request');
                let accumulatedResults = await runAnalysis('mainAnalysis');
                                
                await saveFinalResult(accumulatedResults, fileHash, fileUri);

            } catch (e: any) {
                console.error("Processing Error:", e);
                setErrorMessage(e.message || 'Произошла неизвестная ошибка.');
                setStage('error');
            }
        };
        
        processFile();
    }, [isOpen, file, user, isSelectedOpenRouter, effectivePdfEngine, model, temperature, includeThoughts, toast, router, onClose, setCurrentProject]);
    
    const isProcessing = stage !== 'complete' && stage !== 'error';

    const stages = useMemo(() => Object.entries(stageInfo)
        .filter(([key]) => key !== 'idle' && key !== 'complete' && key !== 'error')
        .map(([key, value]) => ({ key: key as StageKey, ...value })), []);

    const currentStageIndex = stages.findIndex(s => s.key === stage);
    
    return (
        <>
            <InsufficientCreditsDialog isOpen={isCreditsDialogOpen} onClose={() => setIsCreditsDialogOpen(false)} />
            <Dialog open={isOpen && !isCreditsDialogOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent onInteractOutside={(e) => { if (isProcessing) e.preventDefault(); }}>
                    <DialogHeader>
                        <DialogTitle>Анализ документа</DialogTitle>
                        <DialogDescription>
                             {errorMessage ? 'При обработке произошла ошибка.' : 'Процесс состоит из нескольких этапов. Пожалуйста, подождите.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="space-y-4">
                           {isSelectedOpenRouter && file?.type === 'application/pdf' && (
                                <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                    <AlertTitle className="text-blue-800 dark:text-blue-300">Движок обработки PDF</AlertTitle>
                                    <AlertDescription className="text-blue-700 dark:text-blue-400">
                                        Будет использован: <span className="font-semibold">{effectivePdfEngine}</span>.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {stages.map((s, index) => {
                                const isDone = currentStageIndex > index;
                                const isCurrent = s.key === stage;
                                const StageIcon = s.icon;
                                return (
                                    <div key={s.key} className={cn("flex items-center gap-3 transition-all", isDone ? "text-green-600" : "text-muted-foreground", isCurrent && "text-primary font-semibold")}>
                                        {isDone ? <CheckCircle className="h-5 w-5" /> : (isCurrent ? <Loader2 className="h-5 w-5 animate-spin" /> : <StageIcon className="h-5 w-5" />)}
                                        <span>{s.text}</span>
                                    </div>
                                )
                            })}
                             {errorMessage && (<Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Произошла ошибка</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert>)}
                        </div>
                    </div>
                     <DialogFooter>
                        <Button onClick={onClose} variant={isProcessing ? "ghost" : "outline"} disabled={isProcessing}>
                            {isProcessing ? 'Пожалуйста, подождите...' : 'Закрыть'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
