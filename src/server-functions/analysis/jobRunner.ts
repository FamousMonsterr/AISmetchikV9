// @ts-nocheck
// src/server-functions/analysis/jobRunner.ts
'use server';

import { collection, doc, getDoc, setDoc, serverTimestamp, updateDoc } from '@/lib/mongoFirestoreServer';
import { db } from '@/lib/firebase';
import constructorConfig from '@/lib/ai-constructor-config.json';
import { generateJson } from '@/services/ai';
import { hydrateSpecificationsForDB } from '@/lib/utils';
import { finalizeProcessingRequest, failProcessingRequest } from '@/actions/userActions';
import { ExtractProjectSpecificationsOutputSchema, type ExtractProjectSpecificationsOutput } from '@/ai/genkit-schemas';
import { DEFAULT_SERVER_QUOTE_CONFIG, SERVER_ANALYSIS_CREDIT_COST } from '../config';
import { appendJobLog, getServerAnalysisJob, updateJobStatus } from './jobService';
import type { ServerAnalysisJob } from './types';
import { SERVER_STAGE_LABELS, type ServerStageKey } from '@/lib/server-analysis-stages';
import { reportUserBug } from '@/actions/adminActions';
import { logProjectEvent } from '@/lib/logger';
import { dispatchNotification } from '@/server-functions/notifications/dispatch';

function pickMainAnalysisPrompt(): string {
  const prompt = constructorConfig.prompts.find((p) => p.id === 'mainAnalysis');
  if (!prompt) {
    throw new Error('Не найден основной промпт mainAnalysis в ai-constructor-config.json');
  }
  return prompt.promptText;
}

async function loadCachedAnalysis(fileSha1: string): Promise<ExtractProjectSpecificationsOutput | null> {
  const cacheRef = doc(db, 'file_analysis_cache', fileSha1);
  const cacheSnap = await getDoc(cacheRef);
  if (!cacheSnap.exists()) return null;
  const data = cacheSnap.data();
  if ((data.reportCount || 0) >= 3) return null;
  return data.originalAiResponse as ExtractProjectSpecificationsOutput;
}

async function ensureS3CacheRecord(fileSha1: string, objectKey?: string, fileName?: string, accessUrl?: string) {
  if (!objectKey || !accessUrl) return;
  const cacheRef = doc(db, 's3_file_cache', fileSha1);
  const cacheSnap = await getDoc(cacheRef);
  if (!cacheSnap.exists()) {
    await setDoc(cacheRef, {
      fileSha1,
      objectKey,
      accessUrl,
      fileName: fileName || 'document',
    });
  }
}

async function updateProjectStage(projectId: string | null | undefined, stage: ServerStageKey, message?: string) {
  if (!projectId) return;
  await updateDoc(doc(db, 'requests', projectId), {
    processingStage: stage,
    processingStageMessage: message || '',
    processingStageUpdatedAt: serverTimestamp(),
  } as any);
}

async function runAiAnalysis(job: ServerAnalysisJob, prompt: string): Promise<ExtractProjectSpecificationsOutput> {
  const aiResult = await generateJson({
    prompt,
    model: job.model,
    file: { fileUri: job.fileUri, mimeType: job.mimeType, fileName: job.fileName },
    temperature: job.temperature,
    includeThoughts: job.includeThoughts,
    userId: job.userId,
  });

  if (!aiResult.text) {
    throw new Error('AI вернул пустой ответ');
  }

  let parsed: any;
  if (typeof aiResult.text === 'string') {
    try {
      parsed = JSON.parse(aiResult.text);
    } catch {
      const match = aiResult.text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
      if (match && (match[1] || match[2])) {
        parsed = JSON.parse(match[1] || match[2]);
      } else {
        throw new Error('AI вернул не-JSON ответ');
      }
    }
  } else {
    parsed = aiResult.text;
  }

  const validation = ExtractProjectSpecificationsOutputSchema.safeParse(parsed);
  if (!validation.success) {
    throw new Error('Ответ AI не прошел валидацию структуры.');
  }
  return validation.data;
}

export async function runServerAnalysisJob(jobId: string): Promise<void> {
  const job = await getServerAnalysisJob(jobId);
  if (!job) {
    throw new Error(`Задача ${jobId} не найдена`);
  }

  let lastStage: ServerStageKey | null = null;
  const setStage = async (stage: ServerStageKey, message?: string) => {
    lastStage = stage;
    await updateProjectStage(job.projectId, stage, message);
  };

  if (job.status === 'cancelled') {
    await appendJobLog(jobId, 'Задача уже отменена, выполнение пропущено', 'cancelled');
    return;
  }

  const ensureNotCancelled = async () => {
    const latest = await getServerAnalysisJob(jobId);
    if (latest?.status === 'cancelled') {
      const err: any = new Error('Задача отменена пользователем');
      err.isCancelled = true;
      throw err;
    }
  };

  await logProjectEvent({
    projectId: job.projectId,
    userId: job.userId,
    jobId,
    action: 'PROJECT_JOB_STATUS',
    stage: 'start',
    status: 'info',
    source: 'worker',
    model: job.model,
    file: {
      name: job.fileName,
      uri: job.fileUri,
      sha1: job.fileSha1,
      objectKey: job.objectKey || null,
    },
    metadata: { status: job.status },
    message: 'Получена серверная задача для обработки',
  });

  await updateJobStatus(jobId, 'running');
  await appendJobLog(jobId, 'Задача перешла в статус running', 'running');
  await setStage('running', 'Задача взята в работу');
  await logProjectEvent({
    projectId: job.projectId,
    userId: job.userId,
    jobId,
    action: 'PROJECT_JOB_STATUS',
    stage: 'running',
    status: 'info',
    source: 'worker',
    model: job.model,
    message: 'Задача переведена в статус running',
  });

  try {
    await ensureS3CacheRecord(job.fileSha1, job.objectKey, job.fileName, job.fileUri);

    await ensureNotCancelled();
    await setStage('analysis_cache', 'Проверка кеша анализа');
    const cached = job.status !== 'cancelled' ? await loadCachedAnalysis(job.fileSha1) : null;
    if (cached) {
      await appendJobLog(jobId, 'Используем кеш анализа', 'cache');
      await logProjectEvent({
        projectId: job.projectId,
        userId: job.userId,
        jobId,
        action: 'PROJECT_CACHE',
        stage: 'analysis_cache_hit',
        status: 'info',
        source: 'worker',
        model: job.model,
        message: 'Используем кеш анализа по fileSha1',
        metadata: { fileSha1: job.fileSha1 },
      });
      await setStage('saving', 'Сохранение результата из кеша');
      const projectId = await persistAnalysisResult(job, cached);
      await setStage('complete', 'Проект готов');
      await updateJobStatus(jobId, 'succeeded', { resultRequestId: projectId });
      await appendJobLog(jobId, 'Задача успешно завершена из кеша', 'complete');
      await logProjectEvent({
        projectId: job.projectId,
        userId: job.userId,
        jobId,
        action: 'PROJECT_PROCESSING_COMPLETE',
        stage: 'cache_result',
        status: 'success',
        source: 'worker',
        model: job.model,
        metadata: { resultRequestId: projectId, cacheUsed: true },
        message: 'Результат проекта взят из кеша анализа',
      });
      await notifyUser(job, 'success', projectId);
      return;
    }

    await appendJobLog(jobId, 'Запуск вызова AI', 'analysis');
    await setStage('analysis', 'Запуск анализа AI');
    await logProjectEvent({
      projectId: job.projectId,
      userId: job.userId,
      jobId,
      action: 'PROJECT_AI_CALL',
      stage: 'ai_request',
      status: 'info',
      source: 'worker',
      model: job.model,
      metadata: {
        temperature: job.temperature ?? null,
        includeThoughts: job.includeThoughts ?? false,
      },
      message: 'Запуск запроса к AI',
    });
    const promptText = pickMainAnalysisPrompt();
    const aiOutput = await runAiAnalysis(job, promptText);
    await ensureNotCancelled();

    await appendJobLog(jobId, 'AI ответ получен, сохраняем проект', 'saving');
    await setStage('saving', 'Сохранение результатов');
    await logProjectEvent({
      projectId: job.projectId,
      userId: job.userId,
      jobId,
      action: 'PROJECT_AI_CALL',
      stage: 'ai_response',
      status: 'success',
      source: 'worker',
      model: job.model,
      response: aiOutput,
      metadata: {
        itemsCount: aiOutput?.items?.length ?? 0,
        hasAiComment: !!aiOutput?.aiComment,
      },
      message: 'AI вернул валидный ответ',
    });
    const projectId = await persistAnalysisResult(job, aiOutput);
    await setStage('complete', 'Проект готов');
    await updateJobStatus(jobId, 'succeeded', { resultRequestId: projectId });
    await appendJobLog(jobId, 'Задача успешно завершена', 'complete');
    await logProjectEvent({
      projectId: job.projectId,
      userId: job.userId,
      jobId,
      action: 'PROJECT_PROCESSING_COMPLETE',
      stage: 'server_job_complete',
      status: 'success',
      source: 'worker',
      model: job.model,
      metadata: { resultRequestId: projectId, creditCost: job.creditCost },
      message: 'Серверная задача завершена и проект сохранен',
    });
    await notifyUser(job, 'success', projectId);
  } catch (error: any) {
    const message = error?.message || 'Неизвестная ошибка при серверном анализе';
    const status = error?.isCancelled ? 'cancelled' : 'failed';
    await updateJobStatus(jobId, status as any, { error: message });
    await appendJobLog(jobId, message, status === 'cancelled' ? 'cancelled' : 'failed');
    const fallbackStage = status === 'cancelled' ? 'cancelled' : 'failed';
    await updateProjectStage(job.projectId, lastStage || fallbackStage, status === 'cancelled' ? 'Процесс остановлен пользователем' : message);
    await logProjectEvent({
      projectId: job.projectId,
      userId: job.userId,
      jobId,
      action: status === 'cancelled' ? 'PROJECT_PROCESSING_CANCELLED' : 'PROJECT_PROCESSING_FAILED',
      stage: 'run_server_job',
      status: status === 'cancelled' ? 'warning' : 'error',
      source: 'worker',
      model: job.model,
      metadata: { serverJobStatus: status },
      message,
      error,
    });
    if (job.projectId) {
      await failProcessingRequest({ userId: job.userId, projectId: job.projectId, status: status === 'cancelled' ? 'cancelled' : 'failed', error: message });
    }
    if (status === 'failed') {
      const stageLabel = lastStage ? (SERVER_STAGE_LABELS[lastStage] || lastStage) : 'unknown';
      const fileUri = job.fileUri && job.fileUri.startsWith('http') ? job.fileUri : undefined;
      await reportUserBug({
        userId: job.userId,
        errorMessage: `Ошибка анализа (этап: ${stageLabel})`,
        errorDetails: message,
        fileUri,
      });
    }
    await notifyUser(job, status as any, job.projectId);
    throw error;
  }
}

async function persistAnalysisResult(job: ServerAnalysisJob, result: ExtractProjectSpecificationsOutput): Promise<string> {
  if (!job.projectId) {
    throw new Error('В задаче отсутствует projectId для сохранения результата.');
  }
  const hydratedItems = hydrateSpecificationsForDB(result.items || []);

  const finalizeResult = await finalizeProcessingRequest({
    userId: job.userId,
    projectId: job.projectId,
    creditCost: job.creditCost ?? SERVER_ANALYSIS_CREDIT_COST,
    fileName: job.fileName,
    fileUri: job.fileUri,
    mimeType: job.mimeType,
    fileSha1: job.fileSha1,
    modelUsed: job.model,
    outputSpecifications: hydratedItems,
    aiComment: result.aiComment,
    analysisDetails: result.analysisDetails,
    importantExtractionNotes: result.importantExtractionNotes,
    quoteConfig: DEFAULT_SERVER_QUOTE_CONFIG,
    aiCallCount: 0,
    s3ObjectKey: job.objectKey || null,
    initialAiResponse: result,
  });
  if (!finalizeResult.success || !finalizeResult.project) {
    throw new Error(finalizeResult.message || 'Не удалось сохранить проект');
  }
  return finalizeResult.project.id;
}

async function notifyUser(job: ServerAnalysisJob, status: 'success' | 'failed' | 'cancelled', projectId?: string | null) {
  try {
    const title = status === 'success' ? 'Анализ завершен' : status === 'cancelled' ? 'Анализ остановлен' : 'Ошибка анализа';
    const content = status === 'success'
      ? `Файл "${job.fileName}" успешно обработан. Откройте проект, чтобы увидеть результат.`
      : status === 'cancelled'
        ? `Анализ файла "${job.fileName}" был отменен. Проект доступен в истории, можно запустить повторно.`
        : `При обработке файла "${job.fileName}" произошла ошибка. Попробуйте повторить анализ.`;
    await dispatchNotification({
      userId: job.userId,
      title,
      content,
      type: status === 'success' ? 'informational' : 'important',
      projectId: projectId || job.projectId,
      idempotencyKey: `server_job:${job.id}:${status}`,
    });
  } catch (e) {
    console.warn('Failed to create user notification for job', job.id, e);
  }
}
