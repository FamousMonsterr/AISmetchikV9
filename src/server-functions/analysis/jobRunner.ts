// @ts-nocheck
// src/server-functions/analysis/jobRunner.ts
'use server';

import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from '@/lib/db-server';
import { db } from '@/lib/db';
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
import { isPdfLikeFile, parseNonPdfFileForModel, parseNonPdfBufferForModel, type ParsedModelImage } from './non-pdf-parser';
import type { PdfEngine } from '@/services/openrouter';
import { isOpenRouterPrivacyRestrictionError, toUserFacingAnalysisError } from '@/lib/analysis-errors';
import { readAiConfig } from '@/lib/ai-config-runtime';
import { generateXiaomiContent } from '@/services/xiaomi';
import { getS3Client } from '@/actions/adminActions';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type PipelineVersion = 'v1' | 'v2' | 'v3' | 'xiaomi-vision';
type ExecutionProvider = 'openrouter' | 'local_hf' | 'xiaomi';

/**
 * Downloads a file from S3 with automatic URL refresh on 403/401 errors.
 * Returns the file buffer.
 */
async function downloadFileWithRefresh(
  fileUri: string,
  objectKey?: string | null,
  bucketType: string = 'analysis'
): Promise<Buffer> {
  // First attempt with the original URL
  let response = await fetch(fileUri);
  
  // If we get a 403 or 401, try to refresh the URL
  if ((response.status === 403 || response.status === 401) && objectKey) {
    console.log(`[downloadFileWithRefresh] Got ${response.status}, refreshing URL for objectKey: ${objectKey}`);
    
    try {
      const { s3Client, config } = await getS3Client(undefined, { bucketType });
      const expiration = config.presignedUrlExpiration ?? 900;
      const getCommand = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
      });
      const freshUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: expiration });
      
      // Retry with the fresh URL
      response = await fetch(freshUrl);
    } catch (refreshError) {
      console.error('[downloadFileWithRefresh] Failed to refresh URL:', refreshError);
      // Continue with the original response (which will fail)
    }
  }
  
  if (!response.ok) {
    throw new Error(`Не удалось скачать файл: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const ANALYSIS_CACHE_COLLECTION = 'file_analysis_cache';
const OCR_MARKDOWN_CACHE_COLLECTION = 'file_markdown_cache';

function pickPromptById(promptId: string): string {
  const prompt = constructorConfig.prompts.find((p) => p.id === promptId);
  if (!prompt) {
    throw new Error(`Не найден промпт ${promptId} в ai-constructor-config.json`);
  }
  return prompt.promptText;
}

function normalizePipelineVersion(version?: string | null): PipelineVersion {
  if (version === 'xiaomi-vision') return 'xiaomi-vision';
  if (version === 'v3') return 'v3';
  return version === 'v2' ? 'v2' : 'v1';
}

function resolveMainExecutionProvider(job: ServerAnalysisJob, pipelineVersion: PipelineVersion): ExecutionProvider {
  if (pipelineVersion === 'xiaomi-vision') return 'xiaomi';
  if (pipelineVersion === 'v1') {
    return 'openrouter';
  }
  return job.executionProvider === 'local_hf' ? 'local_hf' : 'openrouter';
}

function parseJsonFromAiText(text: unknown): any {
  if (typeof text === 'object' && text !== null) {
    return text;
  }
  if (typeof text !== 'string') {
    throw new Error('AI вернул неожиданный тип ответа');
  }

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
    if (match && (match[1] || match[2])) {
      return JSON.parse(match[1] || match[2]);
    }
    throw new Error('AI вернул не-JSON ответ');
  }
}

function validateAnalysisOutput(payload: any): ExtractProjectSpecificationsOutput {
  const validation = ExtractProjectSpecificationsOutputSchema.safeParse(payload);
  if (!validation.success) {
    throw new Error('Ответ AI не прошел валидацию структуры.');
  }
  return validation.data;
}

function normalizeMarkdownText(markdown: string): string {
  const trimmed = markdown.trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/i);
  return (fenceMatch?.[1] || trimmed).trim();
}

function isCompatibleCacheVersion(cacheVersion: unknown, targetVersion: PipelineVersion): boolean {
  const normalizedCacheVersion = cacheVersion === 'xiaomi-vision' ? 'xiaomi-vision' : cacheVersion === 'v3' ? 'v3' : cacheVersion === 'v2' ? 'v2' : 'v1';
  // v2 and v3 are functionally identical (two-stage OCR → analysis), so they are compatible with each other
  if ((normalizedCacheVersion === 'v2' || normalizedCacheVersion === 'v3') && (targetVersion === 'v2' || targetVersion === 'v3')) {
    return true;
  }
  // xiaomi-vision is only compatible with itself
  if (targetVersion === 'xiaomi-vision' || normalizedCacheVersion === 'xiaomi-vision') {
    return normalizedCacheVersion === targetVersion;
  }
  return normalizedCacheVersion === targetVersion;
}

async function loadCachedAnalysis(fileSha1: string, pipelineVersion: PipelineVersion): Promise<ExtractProjectSpecificationsOutput | null> {
  const cacheRef = doc(db, ANALYSIS_CACHE_COLLECTION, fileSha1);
  const cacheSnap = await getDoc(cacheRef);
  if (!cacheSnap.exists()) return null;
  const data = cacheSnap.data();
  if ((data.reportCount || 0) >= 3) return null;
  if (!isCompatibleCacheVersion(data.pipelineVersion, pipelineVersion)) return null;
  if (!data.originalAiResponse) return null;

  const validation = ExtractProjectSpecificationsOutputSchema.safeParse(data.originalAiResponse);
  if (!validation.success) return null;
  return validation.data;
}

async function loadCachedOcrMarkdown(fileSha1: string): Promise<string | null> {
  const cacheRef = doc(db, OCR_MARKDOWN_CACHE_COLLECTION, fileSha1);
  const cacheSnap = await getDoc(cacheRef);
  if (!cacheSnap.exists()) return null;
  const data = cacheSnap.data();
  const markdown = typeof data.markdown === 'string'
    ? data.markdown
    : typeof data.ocrMarkdown === 'string'
      ? data.ocrMarkdown
      : null;
  if (!markdown?.trim()) return null;
  return normalizeMarkdownText(markdown);
}

async function saveCachedOcrMarkdown(job: ServerAnalysisJob, markdown: string) {
  const cacheRef = doc(db, OCR_MARKDOWN_CACHE_COLLECTION, job.fileSha1);
  await setDoc(cacheRef, {
    fileSha1: job.fileSha1,
    fileName: job.fileName,
    mimeType: job.mimeType,
    sourceFileUri: job.fileUri,
    markdown,
    pipelineVersion: 'v2',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
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

async function runAnalysisWithFile(
  job: ServerAnalysisJob,
  prompt: string,
  providerOverride: ExecutionProvider
): Promise<ExtractProjectSpecificationsOutput> {
  const aiResult = await generateJson({
    prompt,
    model: job.model,
    file: { fileUri: job.fileUri, mimeType: job.mimeType, fileName: job.fileName },
    temperature: job.temperature,
    includeThoughts: job.includeThoughts,
    userId: job.userId,
    providerOverride,
  });

  if (!aiResult.text) {
    throw new Error('AI вернул пустой ответ');
  }

  const parsed = parseJsonFromAiText(aiResult.text);
  return validateAnalysisOutput(parsed);
}

type OcrMarkdownRunResult = {
  markdown: string;
  engine: PdfEngine;
  attemptErrors: string[];
};

const PDF_TEXT_ENGINE_MAX_BYTES = 5 * 1024 * 1024;

async function resolveRemoteFileSize(fileUri: string): Promise<number | null> {
  try {
    const response = await fetch(fileUri, { method: 'HEAD' });
    if (!response.ok) return null;
    const contentLength = response.headers.get('content-length');
    if (!contentLength) return null;
    const parsed = Number(contentLength);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function extractMarkdownFromOcrResult(text: unknown): string {
  if (!text || typeof text !== 'string') {
    throw new Error('OCR этап вернул пустой markdown');
  }
  const rawText = text.trim();
  try {
    const maybeJson = JSON.parse(rawText);
    const markdownFromJson = maybeJson?.ocrMarkdown || maybeJson?.markdown || maybeJson?.text;
    if (typeof markdownFromJson === 'string' && markdownFromJson.trim()) {
      return normalizeMarkdownText(markdownFromJson);
    }
  } catch {
    // Not JSON, continue with text.
  }
  return normalizeMarkdownText(rawText);
}

async function runOcrMarkdown(job: ServerAnalysisJob, prompt: string): Promise<OcrMarkdownRunResult> {
  // Используем OCR-модель и провайдер из конфига
  const aiConfig = await readAiConfig();
  const ocrModel = aiConfig.ocrModel || 'google/gemini-2.5-flash-lite';
  const ocrProvider = aiConfig.ocrProvider || 'openrouter';

  const enginesToTry: PdfEngine[] = ['cloudflare-ai', 'native', 'mistral-ocr'];
  const attemptErrors: string[] = [];
  const fileSizeBytes = await resolveRemoteFileSize(job.fileUri);

  for (const engine of enginesToTry) {
    if (engine === 'cloudflare-ai' && fileSizeBytes && fileSizeBytes > PDF_TEXT_ENGINE_MAX_BYTES) {
      attemptErrors.push(`[cloudflare-ai] skipped: file size ${fileSizeBytes} bytes exceeds ${PDF_TEXT_ENGINE_MAX_BYTES} bytes limit`);
      continue;
    }
    try {
      const aiResult = await generateJson({
        prompt,
        model: ocrModel,
        file: { fileUri: job.fileUri, mimeType: job.mimeType, fileName: job.fileName },
        temperature: 0,
        includeThoughts: false,
        userId: job.userId,
        providerOverride: ocrProvider as any,
        responseMimeType: 'text/plain',
        pdfEngine: engine,
      });
      const markdown = extractMarkdownFromOcrResult(aiResult.text);
      if (!markdown.trim()) {
        throw new Error('OCR этап вернул пустой markdown');
      }
      return {
        markdown,
        engine,
        attemptErrors,
      };
    } catch (error: any) {
      const message = error?.message || `OCR engine ${engine} failed`;
      attemptErrors.push(`[${engine}] ${message}`);
      if (isOpenRouterPrivacyRestrictionError(message)) {
        break;
      }
    }
  }

  const rawMessage = `OCR этап не выполнен ни одним движком. ${attemptErrors.join(' | ')}`;
  const error: any = new Error('OCR stage failed');
  error.rawMessage = rawMessage;
  error.userMessage = toUserFacingAnalysisError(rawMessage);
  error.attemptErrors = attemptErrors;
  throw error;
}

function buildV1PromptWithParsedContent(prompt: string, parsedMarkdown: string): string {
  return `${prompt}

## ДОПОЛНИТЕЛЬНЫЕ ДАННЫЕ ДЛЯ НЕ-PDF ФАЙЛА
Ниже уже извлеченный текст и контекст из исходного файла.
Используй эти данные как основной источник для построения JSON-ответа.

${parsedMarkdown}`;
}

async function runAnalysisFromMarkdown(
  job: ServerAnalysisJob,
  prompt: string,
  ocrMarkdown: string,
  providerOverride: ExecutionProvider,
  images?: ParsedModelImage[]
): Promise<ExtractProjectSpecificationsOutput> {
  const aiResult = await generateJson({
    prompt,
    model: job.model,
    temperature: job.temperature,
    includeThoughts: job.includeThoughts,
    userId: job.userId,
    ocrMarkdown,
    providerOverride,
    images,
  });

  if (!aiResult.text) {
    throw new Error('AI вернул пустой ответ');
  }

  const parsed = parseJsonFromAiText(aiResult.text);
  return validateAnalysisOutput(parsed);
}

async function runAnalysisFromParsedContent(
  job: ServerAnalysisJob,
  prompt: string,
  parsedMarkdown: string,
  providerOverride: ExecutionProvider,
  images?: ParsedModelImage[]
): Promise<ExtractProjectSpecificationsOutput> {
  const aiResult = await generateJson({
    prompt: buildV1PromptWithParsedContent(prompt, parsedMarkdown),
    model: job.model,
    temperature: job.temperature,
    includeThoughts: job.includeThoughts,
    userId: job.userId,
    providerOverride,
    images,
  });

  if (!aiResult.text) {
    throw new Error('AI вернул пустой ответ');
  }

  const parsed = parseJsonFromAiText(aiResult.text);
  return validateAnalysisOutput(parsed);
}

export async function runServerAnalysisJob(jobId: string, options: { alreadyClaimed?: boolean } = {}): Promise<void> {
  const job = await getServerAnalysisJob(jobId);
  if (!job) {
    throw new Error(`Задача ${jobId} не найдена`);
  }

  const pipelineVersion = normalizePipelineVersion(job.pipelineVersion);
  const mainExecutionProvider = resolveMainExecutionProvider(job, pipelineVersion);

  let aiCallCount = 0;
  let lastStage: ServerStageKey | null = null;
  const setStage = async (stage: ServerStageKey, message?: string) => {
    lastStage = stage;
    await updateProjectStage(job.projectId, stage, message);
  };

  if (job.status === 'cancelled') {
    await appendJobLog(jobId, 'Задача уже отменена, выполнение пропущено', 'cancelled');
    return;
  }

  if (job.status !== 'queued' && job.status !== 'running') {
    await appendJobLog(jobId, `Задача в статусе ${job.status}, выполнение пропущено`, 'running');
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
    metadata: {
      status: job.status,
      pipelineVersion,
      executionProvider: mainExecutionProvider,
    },
    message: 'Получена серверная задача для обработки',
  });

  if (!options.alreadyClaimed && job.status === 'queued') {
    await updateJobStatus(jobId, 'running');
    await appendJobLog(jobId, 'Задача перешла в статус running', 'running');
  } else {
    await appendJobLog(jobId, 'Задача уже зарезервирована воркером, продолжаем выполнение', 'running');
  }
  await setStage('running', 'Задача взята в работу');
  if (pipelineVersion === 'v1' && job.executionProvider === 'local_hf') {
    await appendJobLog(jobId, 'Для V1 принудительно выбран OpenRouter (local_hf поддерживается только для V2)', 'running');
  }

  await logProjectEvent({
    projectId: job.projectId,
    userId: job.userId,
    jobId,
    action: 'PROJECT_JOB_STATUS',
    stage: 'running',
    status: 'info',
    source: 'worker',
    model: job.model,
    metadata: {
      pipelineVersion,
      executionProvider: mainExecutionProvider,
    },
    message: 'Задача переведена в статус running',
  });

  try {
    await ensureS3CacheRecord(job.fileSha1, job.objectKey, job.fileName, job.fileUri);

    await ensureNotCancelled();
    await setStage('analysis_cache', 'Проверка кеша анализа');
    const cached = job.status !== 'cancelled' ? await loadCachedAnalysis(job.fileSha1, pipelineVersion) : null;
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
        metadata: {
          fileSha1: job.fileSha1,
          pipelineVersion,
        },
      });
      await setStage('saving', 'Сохранение результата из кеша');
      const projectId = await persistAnalysisResult(job, cached, 0);
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
        metadata: {
          resultRequestId: projectId,
          cacheUsed: true,
          pipelineVersion,
          executionProvider: mainExecutionProvider,
        },
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
        pipelineVersion,
        executionProvider: mainExecutionProvider,
      },
      message: 'Запуск запроса к AI',
    });

    let aiOutput: ExtractProjectSpecificationsOutput;
    const isPdfInput = isPdfLikeFile(job.mimeType, job.fileName);

    if (pipelineVersion === 'v2' || pipelineVersion === 'v3') {
      let ocrMarkdown = '';
      let parsedImages: ParsedModelImage[] = [];

      if (isPdfInput) {
        await setStage('markdown_cache', 'Проверка markdown кеша OCR');
        ocrMarkdown = await loadCachedOcrMarkdown(job.fileSha1) || '';

        if (ocrMarkdown) {
          await appendJobLog(jobId, 'Используем кеш markdown OCR', 'markdown_cache');
          await logProjectEvent({
            projectId: job.projectId,
            userId: job.userId,
            jobId,
            action: 'PROJECT_CACHE',
            stage: 'ocr_markdown_cache_hit',
            status: 'info',
            source: 'worker',
            model: job.model,
            metadata: {
              fileSha1: job.fileSha1,
              markdownLength: ocrMarkdown.length,
              pipelineVersion,
            },
            message: 'Используем markdown кеш по fileSha1',
          });
        } else {
          await ensureNotCancelled();
          await setStage('ocr_markdown', 'OCR документа в markdown');
          const ocrConfigForLog = await readAiConfig();
          await appendJobLog(jobId, `Запуск OCR этапа (модель: ${ocrConfigForLog.ocrModel || 'google/gemini-2.5-flash-lite'}, ${ocrConfigForLog.ocrProvider || 'openrouter'})`, 'ocr_markdown');
          const ocrPrompt = pickPromptById('ocrMarkdownPrompt');
          const ocrResult = await runOcrMarkdown(job, ocrPrompt);
          ocrMarkdown = ocrResult.markdown;
          aiCallCount += 1;
          if (ocrResult.engine !== 'cloudflare-ai') {
            await appendJobLog(
              jobId,
              `Cloudflare AI недоступен, использован fallback engine: ${ocrResult.engine}`,
              'ocr_markdown'
            );
          }
          if (ocrResult.attemptErrors.length > 0) {
            await appendJobLog(
              jobId,
              `Ошибки OCR попыток: ${ocrResult.attemptErrors.join(' | ')}`,
              'ocr_markdown'
            );
          }
          await saveCachedOcrMarkdown(job, ocrMarkdown);
        }
      } else {
        await ensureNotCancelled();
        await setStage('ocr_markdown', 'Парсинг не-PDF файла (текст + base64 изображений)');
        await appendJobLog(jobId, 'Для non-PDF отключаем OCR-плагин и парсим текст/изображения локально', 'ocr_markdown');
        const fileBuffer = await downloadFileWithRefresh(job.fileUri, job.objectKey);
        const parsed = await parseNonPdfBufferForModel({
          fileBuffer,
          fileName: job.fileName,
          mimeType: job.mimeType,
        });
        ocrMarkdown = parsed.markdown;
        parsedImages = parsed.images;
        await appendJobLog(
          jobId,
          `Non-PDF парсинг завершен: mode=${parsed.parsingMode}, textLength=${parsed.rawTextLength}, images=${parsed.images.length}`,
          'ocr_markdown'
        );
      }

      await ensureNotCancelled();
      await setStage('analysis', 'Анализ markdown и формирование спецификации');
      const promptV2 = pickPromptById('mainAnalysisV2');
      aiOutput = await runAnalysisFromMarkdown(job, promptV2, ocrMarkdown, mainExecutionProvider, parsedImages);
      aiCallCount += 1;
    } else if (pipelineVersion === 'xiaomi-vision') {
      // ─── Xiaomi Vision Pipeline ───
      // Stage 1: Extract text + images from file
      // Stage 2: Analyze images via vision model (mimo-v2.5)
      // Stage 3: Final analysis via analysis model (mimo-v2.5-pro)
      const aiConfig = await readAiConfig();
      const visionModel = aiConfig.visionModel || 'mimo-v2.5';
      const analysisModel = aiConfig.analysisModel || 'mimo-v2.5-pro';

      let ocrMarkdown = '';
      let parsedImages: ParsedModelImage[] = [];

      // Stage 1: Extract content
      await ensureNotCancelled();
      await setStage('ocr_markdown', 'Извлечение текста и изображений');
      if (isPdfInput) {
        ocrMarkdown = await loadCachedOcrMarkdown(job.fileSha1) || '';
        if (!ocrMarkdown) {
          // Use OCR to extract text from PDF
          const ocrPrompt = pickPromptById('ocrMarkdownPrompt');
          const ocrResult = await runOcrMarkdown(job, ocrPrompt);
          ocrMarkdown = ocrResult.markdown;
          await saveCachedOcrMarkdown(job, ocrMarkdown);
          aiCallCount += 1;
        }
        await appendJobLog(jobId, `Текст извлечён: ${ocrMarkdown.length} символов`, 'ocr_markdown');
      } else {
        const fileBuffer = await downloadFileWithRefresh(job.fileUri, job.objectKey);
        const parsed = await parseNonPdfBufferForModel({ fileBuffer, fileName: job.fileName, mimeType: job.mimeType });
        ocrMarkdown = parsed.markdown;
        parsedImages = parsed.images;
        await appendJobLog(jobId, `Non-PDF парсинг: text=${parsed.rawTextLength}, images=${parsed.images.length}`, 'ocr_markdown');
      }

      // Stage 2: Vision analysis (images → mimo-v2.5)
      let visionDescription = '';
      if (parsedImages.length > 0) {
        await ensureNotCancelled();
        await setStage('vision_analysis', `Анализ ${parsedImages.length} изображений через ${visionModel}`);
        await appendJobLog(jobId, `Запуск vision анализа: ${visionModel}, ${parsedImages.length} изображений`, 'vision_analysis');

        const visionResult = await generateXiaomiContent({
          prompt: `Ты — эксперт по анализу строительной и проектной документации.
Проанализируй все прикреплённые изображения и опиши подробно что на них изображено.
Для каждого изображения укажи: тип документа, все текстовые надписи, числа, размеры, маркировки, технические детали.
Будь максимально точным. Извлеки ВСЕ текстовые данные из изображений.`,
          modelInfo: { value: visionModel },
          temperature: 0.1,
          userId: job.userId,
          images: parsedImages.map(img => ({ dataUri: img.dataUri, mimeType: img.mimeType })),
          stream: false,
          responseMimeType: 'text/plain',
        });
        visionDescription = visionResult.text || '';
        aiCallCount += 1;
        await appendJobLog(jobId, `Vision анализ завершён: ${visionDescription.length} символов`, 'vision_analysis');
      } else {
        await appendJobLog(jobId, 'Нет изображений для vision анализа, пропускаем этап', 'vision_analysis');
      }

      // Stage 3: Final analysis (text + vision → mimo-v2.5-pro)
      await ensureNotCancelled();
      await setStage('analysis', `Финальный анализ через ${analysisModel}`);
      await appendJobLog(jobId, `Запуск финального анализа: ${analysisModel}`, 'analysis');

      const promptV2 = pickPromptById('mainAnalysisV2');
      const enhancedPrompt = visionDescription
        ? `${promptV2}\n\n## АНАЛИЗ ИЗОБРАЖЕНИЙ\n${visionDescription}`
        : promptV2;

      aiOutput = await runAnalysisFromMarkdown(job, enhancedPrompt, ocrMarkdown, mainExecutionProvider, parsedImages);
      aiCallCount += 1;
    } else {
      const promptText = pickPromptById('mainAnalysis');
      if (isPdfInput) {
        aiOutput = await runAnalysisWithFile(job, promptText, mainExecutionProvider);
      } else {
        await ensureNotCancelled();
        await setStage('ocr_markdown', 'Парсинг не-PDF файла (текст + base64 изображений)');
        await appendJobLog(jobId, 'V1 non-PDF: OCR-плагин не используется, запускаем локальный парсинг', 'ocr_markdown');
        const fileBuffer = await downloadFileWithRefresh(job.fileUri, job.objectKey);
        const parsed = await parseNonPdfBufferForModel({
          fileBuffer,
          fileName: job.fileName,
          mimeType: job.mimeType,
        });
        await appendJobLog(
          jobId,
          `V1 non-PDF парсинг завершен: mode=${parsed.parsingMode}, textLength=${parsed.rawTextLength}, images=${parsed.images.length}`,
          'ocr_markdown'
        );
        await setStage('analysis', 'Анализ parsed-контекста и формирование спецификации');
        aiOutput = await runAnalysisFromParsedContent(
          job,
          promptText,
          parsed.markdown,
          mainExecutionProvider,
          parsed.images
        );
      }
      aiCallCount += 1;
    }

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
        hasAiComment: !!(aiOutput?.aiComment || aiOutput?.aiGeneralComment),
        pipelineVersion,
        executionProvider: mainExecutionProvider,
        aiCallCount,
      },
      message: 'AI вернул валидный ответ',
    });

    const projectId = await persistAnalysisResult(job, aiOutput, aiCallCount);
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
      metadata: {
        resultRequestId: projectId,
        creditCost: job.creditCost,
        pipelineVersion,
        executionProvider: mainExecutionProvider,
        aiCallCount,
      },
      message: 'Серверная задача завершена и проект сохранен',
    });
    await notifyUser(job, 'success', projectId);
  } catch (error: any) {
    const rawMessage = error?.rawMessage || error?.message || 'Неизвестная ошибка при серверном анализе';
    const userMessage = error?.userMessage || toUserFacingAnalysisError(rawMessage);
    const status = error?.isCancelled ? 'cancelled' : 'failed';
    await updateJobStatus(jobId, status as any, { error: rawMessage });
    await appendJobLog(jobId, `SYSTEM_ERROR: ${rawMessage}`, status === 'cancelled' ? 'cancelled' : 'failed');
    if (Array.isArray(error?.attemptErrors) && error.attemptErrors.length > 0) {
      await appendJobLog(jobId, `OCR_ATTEMPTS: ${error.attemptErrors.join(' | ')}`, 'ocr_markdown');
    }
    if (userMessage !== rawMessage) {
      await appendJobLog(jobId, `USER_ERROR: ${userMessage}`, status === 'cancelled' ? 'cancelled' : 'failed');
    }
    const fallbackStage = status === 'cancelled' ? 'cancelled' : 'failed';
    await updateProjectStage(
      job.projectId,
      fallbackStage,
      status === 'cancelled' ? 'Процесс остановлен пользователем' : userMessage
    );
    await logProjectEvent({
      projectId: job.projectId,
      userId: job.userId,
      jobId,
      action: status === 'cancelled' ? 'PROJECT_PROCESSING_CANCELLED' : 'PROJECT_PROCESSING_FAILED',
      stage: 'run_server_job',
      status: status === 'cancelled' ? 'warning' : 'error',
      source: 'worker',
      model: job.model,
      metadata: {
        serverJobStatus: status,
        pipelineVersion,
        executionProvider: mainExecutionProvider,
        userMessage,
      },
      message: rawMessage,
      error,
    });
    if (job.projectId) {
      await failProcessingRequest({
        userId: job.userId,
        projectId: job.projectId,
        status: status === 'cancelled' ? 'cancelled' : 'failed',
        error: status === 'cancelled' ? 'Процесс остановлен пользователем' : userMessage,
      });
    }
    if (status === 'failed') {
      const stageLabel = lastStage ? (SERVER_STAGE_LABELS[lastStage] || lastStage) : 'unknown';
      const fileUri = job.fileUri && job.fileUri.startsWith('http') ? job.fileUri : undefined;
      await reportUserBug({
        userId: job.userId,
        errorMessage: `Ошибка анализа (этап: ${stageLabel})`,
        errorDetails: rawMessage,
        fileUri,
      });
    }
    await notifyUser(job, status as any, job.projectId);
    throw error;
  }
}

async function persistAnalysisResult(job: ServerAnalysisJob, result: ExtractProjectSpecificationsOutput, aiCallCount = 0): Promise<string> {
  if (!job.projectId) {
    throw new Error('В задаче отсутствует projectId для сохранения результата.');
  }

  const consistencyNotes = (result.consistencyIssues || []).map((issue: any) => {
    const severity = issue?.severity ? `[${issue.severity}] ` : '';
    const recommendation = issue?.recommendation ? ` (${issue.recommendation})` : '';
    return `Проверка: ${severity}${issue?.message || 'Обнаружена нестыковка'}${recommendation}`;
  });
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
    aiComment: result.aiComment || result.aiGeneralComment,
    analysisDetails: result.analysisDetails,
    importantExtractionNotes: [...(result.importantExtractionNotes || []), ...consistencyNotes],
    quoteConfig: DEFAULT_SERVER_QUOTE_CONFIG,
    aiCallCount,
    s3ObjectKey: job.objectKey || null,
    pipelineVersion: normalizePipelineVersion(job.pipelineVersion),
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
