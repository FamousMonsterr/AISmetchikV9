// src/app/api/main-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateJson, generateWithOcrPipeline } from '@/services/ai';
import { isPdfLikeFile, parseNonPdfFileForModel, parseNonPdfBufferForModel } from '@/server-functions/analysis/non-pdf-parser';
import { requireAuthenticatedUser, validateRequestedUserId } from '@/lib/api-auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateFileUriAgainstAllowlist } from '@/lib/file-uri-security';
import { queueApiMetricLog } from '@/lib/api-metrics';
import { readAiConfig } from '@/lib/ai-config-runtime';
import { getS3Client } from '@/actions/adminActions';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MainAnalysisRequestSchema = z.object({
  file: z.object({
    fileUri: z.string().url(),
    mimeType: z.string(),
    fileName: z.string().optional(),
  }).optional(),
  prompt: z.string(),
  model: z.string(),
  temperature: z.number().optional(),
  includeThoughts: z.boolean().optional(),
  userId: z.string(),
  pdfEngine: z.enum(['auto', 'native', 'mistral-ocr', 'pdf-text']).optional(),
});

/**
 * Downloads a file from S3 with automatic URL refresh on 403/401 errors.
 * Returns the file buffer.
 */
async function downloadFileWithRefresh(
  fileUri: string,
  objectKey?: string | null,
  bucketType: 'default' | 'analysis' | 'personal' | 'avatars' | 'user_docs' | 'project_docs' = 'analysis'
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


export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth.response;

    const rateLimitResponse = enforceRateLimit({
      request,
      scope: 'api:main-analysis',
      userId: auth.user.id,
      max: 8,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = MainAnalysisRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, message: 'Invalid request body.', errors: validation.error.flatten() }, { status: 400 });
    }

    const analysisInput = validation.data;
    const userValidation = validateRequestedUserId(analysisInput.userId, auth.user.id);
    if (!userValidation.ok) return userValidation.response;

    if (analysisInput.file?.fileUri) {
      const fileUriValidation = await validateFileUriAgainstAllowlist(analysisInput.file.fileUri);
      if (!fileUriValidation.ok) {
        return NextResponse.json({
          error: fileUriValidation.reason || 'Недопустимый fileUri.',
          host: fileUriValidation.host,
        }, { status: 400 });
      }
    }

    let effectiveInput: any = analysisInput;
    let usedOcrPipeline = false;

    // Определяем провайдер модели
    const aiConfig = await readAiConfig();
    const modelInfo = aiConfig.apiModels.find(m => m.value === analysisInput.model);
    const modelProvider = modelInfo?.provider || 'openrouter';
    const isPdf = analysisInput.file && isPdfLikeFile(analysisInput.file.mimeType, analysisInput.file.fileName || 'document');

    // Для PDF + модель анализатора: используем двухэтапный пайплайн
    // PDF → OCR модель (извлечение) → markdown → модель анализа (ответ)
    const pipelineAnalysisProvider = aiConfig.analysisProvider || 'xiaomi';
    if (isPdf && modelProvider === pipelineAnalysisProvider && analysisInput.file) {
      const ocrResult = await generateWithOcrPipeline({
        prompt: analysisInput.prompt,
        model: analysisInput.model,
        file: analysisInput.file,
        userId: auth.user.id,
        temperature: analysisInput.temperature,
        includeThoughts: analysisInput.includeThoughts,
        pdfEngine: analysisInput.pdfEngine,
      });

      if (!ocrResult.text) {
        throw new Error("AI response text is null or empty.");
      }

      // Сохраняем OCR markdown в кеш для повторного использования
      if (ocrResult.ocrMarkdown && analysisInput.file?.fileUri) {
        try {
          const { getDb } = await import('@/lib/mongodb');
          const db = await getDb();
          await db.collection('file_markdown_cache').updateOne(
            { fileUri: analysisInput.file.fileUri.substring(0, 500) } as any,
            { $set: {
              markdown: ocrResult.ocrMarkdown,
              ocrModel: aiConfig.ocrModel,
              updatedAt: new Date(),
            }},
            { upsert: true }
          );
        } catch (e) {
          console.warn('Не удалось сохранить OCR markdown в кеш:', (e as Error).message);
        }
      }

      let finalJsonResponse;
      try {
        if (typeof ocrResult.text === 'object') {
          finalJsonResponse = ocrResult.text;
        } else if (typeof ocrResult.text === 'string') {
          finalJsonResponse = JSON.parse(ocrResult.text);
        } else {
          throw new Error("Unsupported type for AI response text.");
        }
      } catch (e) {
        const text = ocrResult.text as string;
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
        if (jsonMatch && (jsonMatch[1] || jsonMatch[2])) {
          try {
            finalJsonResponse = JSON.parse(jsonMatch[1] || jsonMatch[2]);
          } catch (e2) {
            throw new Error("AI returned malformed JSON content.");
          }
        } else {
          throw new Error("AI returned a non-JSON response, even when JSON was requested.");
        }
      }

      queueApiMetricLog({
        ts: new Date().toISOString(),
        endpoint: '/api/main-analysis',
        userId: auth.user.id,
        status: 200,
        durationMs: Date.now() - startedAt,
        model: analysisInput.model,
        metadata: { pipeline: 'v3-ocr-then-analyze', ocrModel: aiConfig.ocrModel },
      });
      // Добавляем OCR markdown и лог пайплайна в ответ
      const responseWithOcr = {
        ...finalJsonResponse,
        _ocrMarkdown: ocrResult.ocrMarkdown || null,
        _ocrModel: aiConfig.ocrModel || null,
        _pipelineLog: (ocrResult as any)._pipelineLog || [],
      };
      return NextResponse.json(responseWithOcr, { status: 200 });
    }

    // Для non-PDF: парсим файл локально
    if (analysisInput.file && !isPdfLikeFile(analysisInput.file.mimeType, analysisInput.file.fileName || 'document')) {
      // Try to extract objectKey from fileUri for URL refresh
      let objectKey: string | undefined;
      try {
        const url = new URL(analysisInput.file.fileUri);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // MinIO path: /bucket-name/object-key
        if (pathParts.length >= 2) {
          objectKey = pathParts.slice(1).join('/');
        }
      } catch {
        // URL parsing failed, continue without objectKey
      }
      
      const fileBuffer = await downloadFileWithRefresh(analysisInput.file.fileUri, objectKey);
      const parsed = await parseNonPdfBufferForModel({
        fileBuffer,
        fileName: analysisInput.file.fileName || 'document',
        mimeType: analysisInput.file.mimeType,
      });
      const promptWithParsedContext = `${analysisInput.prompt}

## ДОПОЛНИТЕЛЬНЫЕ ДАННЫЕ ДЛЯ НЕ-PDF ФАЙЛА
Ниже уже извлеченный текст и контекст из исходного файла.
Используй эти данные как основной источник для построения JSON-ответа.

${parsed.markdown}`;

      effectiveInput = {
        ...analysisInput,
        userId: auth.user.id,
        prompt: promptWithParsedContext,
        file: undefined,
        images: parsed.images,
      };
    }

    // Стандартный путь: PDF + OpenRouter модель, или non-PDF
    const { text, rawResponse } = await generateJson({
      ...effectiveInput,
      userId: auth.user.id,
    });

    let finalJsonResponse;

    if (!text) {
        throw new Error("AI response text is null or empty.");
    }

    try {
        if (typeof text === 'object') {
            finalJsonResponse = text;
        } else if (typeof text === 'string') {
            finalJsonResponse = JSON.parse(text);
        } else {
             throw new Error("Unsupported type for AI response text.");
        }
    } catch (e) {
        console.warn("Direct JSON.parse failed, attempting to find JSON block.");
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
        if (jsonMatch && (jsonMatch[1] || jsonMatch[2])) {
            try {
                finalJsonResponse = JSON.parse(jsonMatch[1] || jsonMatch[2]);
            } catch (e2) {
                 console.error("Failed to parse extracted JSON block:", text);
                 throw new Error("AI returned malformed JSON content.");
            }
        } else {
             console.error("No valid JSON found in AI response:", text);
             throw new Error("AI returned a non-JSON response, even when JSON was requested.");
        }
    }

    queueApiMetricLog({
      ts: new Date().toISOString(),
      endpoint: '/api/main-analysis',
      userId: auth.user.id,
      status: 200,
      durationMs: Date.now() - startedAt,
      model: analysisInput.model,
    });
    return NextResponse.json(finalJsonResponse, { status: 200 });

  } catch (error: any) {
    console.error('[Main Analysis API Route Error]', error);
    const errorMessage = error.message || 'An unknown server error occurred.';
    const pipelineLog = error._pipelineLog || [];
    queueApiMetricLog({
      ts: new Date().toISOString(),
      endpoint: '/api/main-analysis',
      userId: '',
      status: 500,
      durationMs: Date.now() - startedAt,
      error: errorMessage,
    });
    return NextResponse.json({ error: errorMessage, _pipelineLog: pipelineLog }, { status: 500 });
  }
}
