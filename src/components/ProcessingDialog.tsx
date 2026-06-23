// @ts-nocheck
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
import { createProcessingRequest, failProcessingRequest, finalizeProcessingRequest, linkRequestToServerJob } from '@/actions/userActions';
import type { ExtractProjectSpecificationsOutput } from '@/ai/genkit-schemas';
import constructorConfig from '@/lib/ai-constructor-config.json';
import { Details } from './Details';
import axios from 'axios';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, updateDoc, increment } from '@/lib/db-client';
import { db } from '@/lib/db';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { type PdfEngine } from '@/services/openrouter';
import aiConfig from '@/lib/ai-config.json';
import { getAppSettings, type AppSettings } from '@/actions/adminActions';
import { SERVER_ANALYSIS_CREDIT_COST } from '@/server-functions/config';
import { SERVER_STAGE_LABELS, type ServerStageKey } from '@/lib/server-analysis-stages';
import { reportUserBug } from '@/actions/adminActions';
import { sanitizeAnalysisErrorForUi } from '@/lib/analysis-errors';


const ANALYSIS_COST = SERVER_ANALYSIS_CREDIT_COST;

type StageKey = 
    | 'idle' 
    | 'checking_credits' 
    | 'getting_hash'
    | 'checking_s3_cache'
    | 'checking_analysis_cache'
    | 'getting_s3_url'
    | 'uploading_to_s3'
    | 'dispatching_server_job'
    | 'preparing_request'
    | 'sending_request'
    | 'analyzing' 
    | 'processing_response'
    | 'saving' 
    | 'complete' 
    | 'error'
    | 'cancelled';

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
    dispatching_server_job: { text: 'Запуск серверной задачи...', icon: Server },
    preparing_request: { text: 'Формирование запроса в ИИ...', icon: FileJson },
    sending_request: { text: 'Отправка запроса в ИИ...', icon: Send },
    analyzing: { text: 'Ожидание ответа ИИ...', icon: Sparkles },
    processing_response: { text: 'Обработка ответа ИИ...', icon: Code },
    saving: { text: 'Сохранение проекта...', icon: Database },
    complete: { text: 'Анализ завершен!', icon: CheckCircle },
    error: { text: 'Произошла ошибка', icon: AlertTriangle },
    cancelled: { text: 'Процесс остановлен', icon: AlertTriangle },
};

interface ProcessingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  model: string;
  temperature?: number;
  includeThoughts?: boolean;
  objectId?: string | null;
  objectName?: string | null;
  onProjectProcessed?: (project: HistoryRequest) => void;
}

export function ProcessingDialog({ isOpen, onClose, file, model, temperature, includeThoughts, objectId, objectName, onProjectProcessed }: ProcessingDialogProps) {
    const { user, setCurrentProject, effectivePlan, setNavigating } = useAppContext();
    const { toast } = useToast();
    const router = useRouter();

    const [stage, setStage] = useState<StageKey>('idle');
    const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [pipelineLog, setPipelineLog] = useState<Array<{
        stage: string; engine?: string; model?: string; provider?: string; endpoint?: string;
        fileMode?: string; status: string; requestSummary?: string; responseSummary?: string;
        error?: string; durationMs?: number; timestamp: string;
    }>>([]);
    const [serverSettings, setServerSettings] = useState<AppSettings | null>(null);
    const [serverSettingsLoaded, setServerSettingsLoaded] = useState(false);
    const [processingProjectId, setProcessingProjectId] = useState<string | null>(null);
    const [serverJobId, setServerJobId] = useState<string | null>(null);
    const [serverStartConfirmed, setServerStartConfirmed] = useState(false);
    const processingStarted = useRef(false);
    const cancelRequested = useRef(false);
    
    const modelInfo = useMemo(() => aiConfig.apiModels.find(m => m.value === model), [model]);
    const effectiveTemperature = temperature ?? modelInfo?.temperature;
    const isSelectedOpenRouter = modelInfo?.provider === 'openrouter';

    // Determine which engine will be used
    const effectivePdfEngine = useMemo(() => {
        if (!isSelectedOpenRouter || !file || file.type !== 'application/pdf') return 'N/A';
        const modelOverride = modelInfo?.pdfEngineOverride;
        if (modelOverride && modelOverride !== 'none') return modelOverride;
        return aiConfig.providers.openrouter.pdfProcessingPriority[0] || 'auto';
    }, [isSelectedOpenRouter, modelInfo, file]);

    const planForCheck = effectivePlan || 'Free';
    const isPlanAllowedForServer = useMemo(() => {
        if (!serverSettings) return false;
        const fallback = serverSettings.serverFunctionsPaidOnly ? ['PRO', 'Business', 'Enterprise'] : ['Free', 'PRO', 'Business', 'Enterprise'];
        const allowed = (serverSettings.serverFunctionsAllowedPlans?.length ? serverSettings.serverFunctionsAllowedPlans : fallback) as string[];
        return allowed.includes(planForCheck);
    }, [serverSettings, planForCheck]);

    const shouldUseServerPipeline = useMemo(() => {
        if (!serverSettings?.serverFunctionsEnabled) return false;
        if (serverSettings.serverFunctionsMode !== 'server') return false;
        if (!isPlanAllowedForServer) return false;
        return true;
    }, [serverSettings, isPlanAllowedForServer]);


    const resetState = () => {
        setStage('idle');
        setErrorMessage(null);
        setPipelineLog([]);
        processingStarted.current = false;
        cancelRequested.current = false;
        setProcessingProjectId(null);
        setServerJobId(null);
        setServerStartConfirmed(false);
    };

    useEffect(() => {
        if (!isOpen) {
            setServerSettings(null);
            setServerSettingsLoaded(false);
            return;
        }
        let cancelled = false;
        const loadSettings = async () => {
            try {
                const data = await getAppSettings();
                if (!cancelled) {
                    setServerSettings(data);
                }
            } catch (error) {
                console.warn('Не удалось загрузить настройки приложения для серверного анализа.', error);
            } finally {
                if (!cancelled) {
                    setServerSettingsLoaded(true);
                }
            }
        };
        loadSettings();
        return () => { cancelled = true; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            resetState();
            return;
        }
        if (!serverSettingsLoaded) return;
        if (processingStarted.current || !file) return;
        processingStarted.current = true;

        const processFile = async () => {
            let fileDataForApi: { fileUri: string; mimeType: string; fileName?: string } | undefined;
            let fileHash: string;
            let objectKey: string | undefined;
            let draftId = processingProjectId;
            let lastStage: ServerStageKey | null = null;
            const selectedPipelineVersion = serverSettings?.analysisPipelineVersion || 'v1';

            const ensureDraftExists = async (hash?: string, uri?: string, objKey?: string) => {
                if (draftId) return draftId;
                const draft = await createProcessingRequest({
                    userId: user!.uid,
                    fileName: file.name,
                    mimeType: file.type,
                    modelUsed: model,
                    temperature: effectiveTemperature,
                    includeThoughts,
                    pipelineVersion: selectedPipelineVersion,
                    fileSha1: hash,
                    fileUri: uri,
                    s3ObjectKey: objKey,
                    objectId,
                    objectName,
                });
                if (!draft.success || !draft.project) {
                    throw new Error(draft.message || 'Не удалось создать черновик проекта.');
                }
                draftId = draft.project.id;
                setProcessingProjectId(draftId);
                setCurrentProject(draft.project);
                onProjectProcessed?.(draft.project);
                return draftId;
            };

            const setProjectStage = async (stageKey: ServerStageKey, message?: string) => {
                lastStage = stageKey;
                if (!draftId) return;
                await updateDoc(doc(db, 'requests', draftId), {
                    processingStage: stageKey,
                    processingStageMessage: message || '',
                    processingStageUpdatedAt: serverTimestamp(),
                } as any);
            };

            const abortIfCancelled = () => {
                if (cancelRequested.current) {
                    const err: any = new Error('PROCESS_CANCELLED');
                    err.isCancelled = true;
                    throw err;
                }
            };

            const runAnalysis = async (promptId: string): Promise<ExtractProjectSpecificationsOutput> => {
                const promptConfig = constructorConfig.prompts.find(p => p.id === promptId);
                if (!promptConfig) throw new Error(`Prompt '${promptId}' not found.`);

                abortIfCancelled();
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

                setStage('sending_request');
                const response = await fetch('/api/main-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: promptConfig.promptText,
                        file: fileDataForApi,
                        model, temperature: effectiveTemperature, includeThoughts,
                        userId: user!.uid,
                        pdfEngine: pdfEngineToUse, // Pass the determined engine
                    }),
                });

                setStage('analyzing');
                const resultJson = await response.json();
                setStage('processing_response');
                abortIfCancelled();

                // Захватываем лог пайплайна из ответа (и при успехе, и при ошибке)
                if (resultJson._pipelineLog && Array.isArray(resultJson._pipelineLog)) {
                    setPipelineLog(resultJson._pipelineLog);
                }

                if (!response.ok) {
                    throw new Error(resultJson.error || `Analysis request failed: ${response.status}.`);
                }

                // Сохраняем OCR markdown в проект для будущего использования
                if (resultJson._ocrMarkdown && draftId) {
                    try {
                        await updateDoc(doc(db, 'requests', draftId), {
                            ocrMarkdown: resultJson._ocrMarkdown,
                            ocrModel: resultJson._ocrModel || null,
                            ocrUpdatedAt: serverTimestamp(),
                        } as any);
                    } catch (e) {
                        console.warn('Не удалось сохранить OCR markdown в проект:', e);
                    }
                }
                
                return resultJson as ExtractProjectSpecificationsOutput;
            };

            const saveFinalResult = async (result: ExtractProjectSpecificationsOutput, hash: string, fileUri?: string) => {
                setStage('saving');
                await setProjectStage('saving');
                const hydratedItems = hydrateSpecificationsForDB(result.items || []);
                await ensureDraftExists(hash, fileUri, objectKey);
                const finalizeResult = await finalizeProcessingRequest({
                    userId: user!.uid,
                    projectId: draftId!,
                    creditCost: ANALYSIS_COST,
                    fileName: file.name,
                    fileUri: fileUri || '',
                    mimeType: file.type,
                    fileSha1: hash,
                    modelUsed: model,
                    outputSpecifications: hydratedItems,
                    aiComment: result.aiComment || result.aiGeneralComment,
                    analysisDetails: result.analysisDetails,
                    importantExtractionNotes: [
                        ...(result.importantExtractionNotes || []),
                        ...((result.consistencyIssues || []).map((issue: any) => `Проверка: ${issue.message}${issue.recommendation ? ` (${issue.recommendation})` : ''}`)),
                    ],
                    quoteConfig: initialQuoteConfig,
                    aiCallCount: 0,
                    s3ObjectKey: objectKey || null,
                    pipelineVersion: selectedPipelineVersion,
                    initialAiResponse: result,
                });
                if (!finalizeResult.success || !finalizeResult.project) throw new Error(finalizeResult.message || "Не удалось сохранить проект.");

                await setProjectStage('complete');
                setCurrentProject(finalizeResult.project);
                onProjectProcessed?.(finalizeResult.project);
                setStage('complete');
                onClose();
                if (!onProjectProcessed) {
                    setNavigating(true);
                    router.push('/dashboard/calculator');
                }
            }
            
            try {
                setStage('checking_credits');
                if (!user || (user.credits || 0) < ANALYSIS_COST) {
                    setIsCreditsDialogOpen(true);
                    onClose();
                    return;
                }
                await ensureDraftExists();
                await setProjectStage('created', 'Проект создан и поставлен в очередь');
                abortIfCancelled();

                setStage('getting_hash');
                await setProjectStage('hashing');
                fileHash = await getFileSha1(file);
                await ensureDraftExists(fileHash);
                abortIfCancelled();
                
                let fileUri: string | undefined;
                let s3Available = true;

                try {
                    setStage('checking_s3_cache');
                    await setProjectStage('s3_cache');
                    const s3CacheRef = doc(db, 's3_file_cache', fileHash);
                    const s3CacheSnap = await getDoc(s3CacheRef);

                    if (s3CacheSnap.exists()) {
                        const data = s3CacheSnap.data();
                        objectKey = data.objectKey;
                        if (draftId) {
                            await updateDoc(doc(db, 'requests', draftId), { fileSha1: fileHash, s3ObjectKey: objectKey || null } as any);
                        }
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
                           const refreshResponse = await fetch("/api/s3-refresh-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objectKey: data.objectKey, bucketType: 'analysis' }), });
                           if (!refreshResponse.ok) {
                             const errBody = await refreshResponse.json().catch(() => ({}));
                             throw new Error(errBody.error || "Не удалось обновить ссылку на S3 файл.");
                           }
                           const { newAccessUrl, newExpirationTimestamp } = await refreshResponse.json();
                           await updateDoc(s3CacheRef, { accessUrl: newAccessUrl, urlExpirationTimestamp: new Timestamp(Math.floor(newExpirationTimestamp / 1000), 0) });
                           fileUri = newAccessUrl;
                        } else {
                           fileUri = data.accessUrl;
                        }
                        if (draftId && fileUri) {
                            await updateDoc(doc(db, 'requests', draftId), { fileUri, updatedAt: serverTimestamp() } as any);
                        }
                    } else {
                        setStage('getting_s3_url');
                        await setProjectStage('s3_upload');
                        const presignedUrlResponse = await fetch("/api/s3-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, fileType: file.type, bucketType: 'analysis' }) });
                        if (!presignedUrlResponse.ok) throw new Error((await presignedUrlResponse.json()).error || "Не удалось получить ссылку для загрузки в S3.");
                        const { uploadUrl, accessUrl, objectKey: uploadObjectKey, urlExpirationTimestamp } = await presignedUrlResponse.json();

                        setStage('uploading_to_s3');
                        await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });

                        await setDoc(s3CacheRef, { fileSha1: fileHash, objectKey: uploadObjectKey, accessUrl, urlExpirationTimestamp: new Timestamp(Math.floor(urlExpirationTimestamp/1000), 0), createdAt: serverTimestamp(), fileName: file.name });
                        fileUri = accessUrl;
                        objectKey = uploadObjectKey;
                        await ensureDraftExists(fileHash, fileUri, objectKey);
                        if (draftId) {
                            await updateDoc(doc(db, 'requests', draftId), { fileUri, s3ObjectKey: objectKey || null, fileSha1: fileHash, updatedAt: serverTimestamp() } as any);
                        }
                    }
                } catch (s3Error: any) {
                    console.warn('S3 недоступен, используется base64 fallback:', s3Error.message);
                    s3Available = false;
                }

                // Fallback: если S3 недоступен, конвертируем файл в base64 data URI
                if (!fileUri) {
                    setStage('preparing_request');
                    await setProjectStage('preparing', 'S3 недоступен, подготовка файла...');
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = reader.result as string;
                            resolve(result);
                        };
                        reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
                        reader.readAsDataURL(file);
                    });
                    fileUri = base64;
                    await ensureDraftExists(fileHash);
                }
                
                abortIfCancelled();
                
                setStage('checking_analysis_cache');
                await setProjectStage('analysis_cache');
                const analysisCacheRef = doc(db, 'file_analysis_cache', fileHash);
                const analysisCacheSnap = await getDoc(analysisCacheRef);
                const cachedPipelineVersion = analysisCacheSnap.exists()
                    ? ((analysisCacheSnap.data()?.pipelineVersion as 'v1' | 'v2' | 'v3' | 'xiaomi-vision' | undefined) || 'v1')
                    : null;
                const isCompatiblePipelineCache = cachedPipelineVersion
                    ? cachedPipelineVersion === selectedPipelineVersion
                    : false;

                if (analysisCacheSnap.exists() && (analysisCacheSnap.data().reportCount || 0) < 3 && isCompatiblePipelineCache) {
                    const cachedData = analysisCacheSnap.data().originalAiResponse as ExtractProjectSpecificationsOutput;
                    abortIfCancelled();
                    await ensureDraftExists(fileHash, fileUri, objectKey);
                    await saveFinalResult(cachedData, fileHash, fileUri);
                    return;
                }

                if (!fileUri) {
                    throw new Error("Не удалось получить ссылку на файл в S3.");
                }
                abortIfCancelled();
                await ensureDraftExists(fileHash, fileUri, objectKey);
                if (draftId) {
                    await updateDoc(doc(db, 'requests', draftId), { fileUri, s3ObjectKey: objectKey || null, updatedAt: serverTimestamp() } as any);
                }

                if (shouldUseServerPipeline) {
                    setStage('dispatching_server_job');
                    await setProjectStage('dispatch');
                    const response = await fetch('/api/server-analysis', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user!.uid,
                            projectId: draftId,
                            fileUri,
                            fileSha1: fileHash,
                            fileName: file.name,
                            mimeType: file.type,
                            objectKey,
                            model,
                            temperature: effectiveTemperature,
                            includeThoughts,
                        }),
                    });
                    const result = await response.json();
                    if (!response.ok || !result.success) {
                        throw new Error(result.error || 'Не удалось отправить задачу на сервер.');
                    }
                    setServerJobId(result.jobId);
                    await linkRequestToServerJob({ userId: user!.uid, projectId: draftId!, serverJobId: result.jobId });
                    await setProjectStage('queued', 'Задача поставлена в очередь');
                    setStage('complete');
                    setServerStartConfirmed(true);
                    return;
                }
                fileDataForApi = { fileUri: fileUri, mimeType: file.type, fileName: file.name };
                if (selectedPipelineVersion === 'v2') {
                    throw new Error('Пайплайн V2 доступен только в серверном режиме. Включите серверные функции в админке.');
                }
                // V3: двухэтапный пайплайн (OCR → Markdown → Анализ) — работает в клиентском режиме
                // main-analysis API сам определяет нужен ли OCR pipeline (PDF + анализатор из analysisProvider)


                setStage('preparing_request');
                await setProjectStage('analysis');
                let accumulatedResults = await runAnalysis('mainAnalysis');
                                
                await saveFinalResult(accumulatedResults, fileHash, fileUri);

            } catch (e: any) {
                console.error("Processing Error:", e);
                if (e?.isCancelled) {
                    setStage('cancelled');
                    setErrorMessage(null);
                    if (draftId) {
                        await setProjectStage('cancelled', 'Процесс остановлен пользователем');
                    }
                } else {
                    const rawErrorMessage = e?.message || 'Произошла неизвестная ошибка.';
                    const userErrorMessage = sanitizeAnalysisErrorForUi(rawErrorMessage);
                    setErrorMessage(userErrorMessage);
                    setStage('error');
                    if (draftId) {
                        await failProcessingRequest({ userId: user!.uid, projectId: draftId, status: 'failed', error: userErrorMessage });
                        await setProjectStage(lastStage || 'failed', userErrorMessage || 'Неизвестная ошибка');
                        await reportUserBug({
                            userId: user!.uid,
                            errorMessage: `Ошибка анализа (этап: ${SERVER_STAGE_LABELS[lastStage || 'failed'] || lastStage || 'unknown'})`,
                            errorDetails: rawErrorMessage,
                            fileUri: fileDataForApi?.fileUri,
                        });
                    }
                }
            }
        };
        
        processFile();
    }, [isOpen, file, user, isSelectedOpenRouter, effectivePdfEngine, model, effectiveTemperature, includeThoughts, toast, router, onClose, setCurrentProject, serverSettingsLoaded, shouldUseServerPipeline, processingProjectId, objectId, objectName, onProjectProcessed]);

    const handleStop = async () => {
        if (!user) return;
        cancelRequested.current = true;
        try {
            if (serverJobId) {
                await fetch('/api/server-analysis/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jobId: serverJobId, projectId: processingProjectId, userId: user.uid }),
                });
            }
            if (processingProjectId) {
                await failProcessingRequest({ userId: user.uid, projectId: processingProjectId, status: 'cancelled', error: 'Процесс остановлен пользователем' });
            }
            setStage('cancelled');
            toast({ title: "Процесс остановлен", description: "Вы сможете запустить анализ повторно из истории." });
            onClose();
        } catch (err: any) {
            console.error('Error cancelling process:', err);
            toast({ title: "Не удалось остановить", description: err?.message || "Попробуйте снова.", variant: "destructive" });
        }
    };
    
    const isProcessing = stage !== 'complete' && stage !== 'error' && stage !== 'cancelled';

    const stages = useMemo(() => Object.entries(stageInfo)
        .filter(([key]) => key !== 'idle' && key !== 'complete' && key !== 'error')
        .map(([key, value]) => ({ key: key as StageKey, ...value })), []);

    const rawStageIndex = stages.findIndex(s => s.key === stage);
    const currentStageIndex = rawStageIndex >= 0 ? rawStageIndex : (stage === 'complete' ? stages.length : -1);
    const serverLaunchWarning = shouldUseServerPipeline && !serverStartConfirmed && isProcessing;
    const serverLaunchSuccess = shouldUseServerPipeline && serverStartConfirmed && stage === 'complete';

    return (
        <>
            <InsufficientCreditsDialog isOpen={isCreditsDialogOpen} onClose={() => setIsCreditsDialogOpen(false)} />
            <Dialog open={isOpen && !isCreditsDialogOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Анализ документа</DialogTitle>
                        <DialogDescription>
                             {errorMessage
                                ? 'При обработке произошла ошибка.'
                                : serverLaunchWarning
                                    ? 'Не закрывайте экран, пока не запустится процесс обработки на сервере.'
                                    : serverLaunchSuccess
                                        ? 'Обработка файла запущена успешно. Мы пришлем уведомление, как файл будет обработан.'
                                        : 'Процесс состоит из нескольких этапов. Пожалуйста, подождите.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="space-y-4">
                           {serverLaunchWarning && (
                                <Alert variant="default" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                                    <AlertTitle className="text-amber-800 dark:text-amber-300">Важно</AlertTitle>
                                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                                        Не закрывайте экран, пока не запустится процесс.
                                    </AlertDescription>
                                </Alert>
                            )}
                           {serverLaunchSuccess && (
                                <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                    <AlertTitle className="text-green-800 dark:text-green-300">Серверная обработка запущена</AlertTitle>
                                    <AlertDescription className="text-green-700 dark:text-green-400">
                                        Обработка файла запущена успешно. Мы пришлем уведомление, как файл будет обработан.
                                    </AlertDescription>
                                </Alert>
                            )}
                           {isSelectedOpenRouter && file?.type === 'application/pdf' && (
                                <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                    <AlertTitle className="text-blue-800 dark:text-blue-300">Движок обработки PDF</AlertTitle>
                                    <AlertDescription className="text-blue-700 dark:text-blue-400">
                                        Будет использован: <span className="font-semibold">{effectivePdfEngine}</span>.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* === БАРАБАН ЭТАПОВ === */}
                            <div className="relative py-2">
                                {/* Вертикальная линия */}
                                <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-border" />

                                {stages.map((s, index) => {
                                    const isDone = currentStageIndex > index;
                                    const isCurrent = s.key === stage;
                                    const isError = stage === 'error' && isCurrent;
                                    const isPrev = index === currentStageIndex - 1;
                                    const isNext = index === currentStageIndex + 1;
                                    const StageIcon = s.icon;

                                    // Скрываем далеко-далёкие этапы для эффекта барабана
                                    const distanceFromCurrent = Math.abs(index - currentStageIndex);
                                    if (distanceFromCurrent > 2 && !isDone && stage !== 'error') return null;

                                    return (
                                        <div
                                            key={s.key}
                                            className={cn(
                                                "relative flex items-center gap-3 py-2.5 transition-all duration-300",
                                                // Прозрачность: текущий 100%, соседи 60%, остальные 30%
                                                isCurrent ? "opacity-100" : isPrev || isNext ? "opacity-60" : isDone ? "opacity-80" : "opacity-30",
                                                // Масштаб: текущий чуть крупнее
                                                isCurrent && "scale-[1.03] origin-left",
                                            )}
                                        >
                                            {/* Иконка */}
                                            <div className={cn(
                                                "relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors",
                                                isError ? "bg-destructive/10 border-destructive text-destructive" :
                                                isDone ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-600" :
                                                isCurrent ? "bg-primary/10 border-primary text-primary" :
                                                "bg-muted border-muted-foreground/30 text-muted-foreground"
                                            )}>
                                                {isError ? <AlertTriangle className="h-4 w-4" /> :
                                                 isDone ? <CheckCircle className="h-4 w-4" /> :
                                                 isCurrent ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                                 <StageIcon className="h-3.5 w-3.5" />}
                                            </div>

                                            {/* Текст */}
                                            <span className={cn(
                                                "text-sm transition-colors",
                                                isError ? "text-destructive font-semibold" :
                                                isCurrent ? "text-primary font-semibold" :
                                                isDone ? "text-green-600 dark:text-green-400" :
                                                "text-muted-foreground"
                                            )}>
                                                {s.text}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {errorMessage && (<Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Произошла ошибка</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert>)}

                            {/* === КОМПАКТНЫЙ ЛОГ ПАЙПЛАЙНА (только при ошибке) === */}
                            {stage === 'error' && pipelineLog.length > 0 && (
                                <details className="mt-2">
                                    <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                                        Детали пайплайна ({pipelineLog.length} шагов)
                                    </summary>
                                    <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                                        {pipelineLog.map((entry, i) => {
                                            // Пропускаем промежуточные "попытка" — показываем только итоги
                                            const isAttempt = entry.stage.includes('попытка [');
                                            const isInit = entry.stage === 'Инициализация пайплайна';
                                            if (isAttempt) return null;

                                            return (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "text-xs flex items-start gap-2 px-2 py-1.5 rounded",
                                                        entry.status === 'error' ? "bg-red-50/80 dark:bg-red-950/20" : ""
                                                    )}
                                                >
                                                    <span className="shrink-0 mt-0.5">
                                                        {entry.status === 'ok' ? '✓' : entry.status === 'error' ? '✗' : '–'}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-medium">{entry.stage.replace(/^OCR: /, '')}</span>
                                                            {entry.engine && <span className="text-muted-foreground">({entry.engine})</span>}
                                                            {entry.durationMs && <span className="text-muted-foreground ml-auto shrink-0">{(entry.durationMs / 1000).toFixed(1)}s</span>}
                                                        </div>
                                                        {entry.error && (
                                                            <p className="text-red-500 mt-0.5 break-all text-[11px]">{entry.error}</p>
                                                        )}
                                                        {!entry.error && entry.responseSummary && !isInit && (
                                                            <p className="text-muted-foreground mt-0.5 text-[11px]">{entry.responseSummary}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>
                     <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-muted-foreground">
                            {serverLaunchWarning
                                ? 'Не закрывайте экран до подтверждения запуска серверной задачи.'
                                : serverLaunchSuccess
                                    ? 'Окно можно закрыть. Результат придет уведомлением и появится в истории.'
                                    : (isProcessing ? 'Вы можете скрыть окно, обработка продолжится в фоне.' : '')}
                        </div>
                        <div className="flex gap-2">
                            {isProcessing && (
                                <Button variant="destructive" onClick={handleStop}>
                                    Остановить
                                </Button>
                            )}
                            <Button onClick={onClose} variant="outline">
                                {serverLaunchSuccess ? 'Закрыть' : 'Скрыть окно'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
