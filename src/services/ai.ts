// @ts-nocheck
// src/services/ai.ts
'use server';

import * as openRouterService from './openrouter';
import * as xiaomiService from './xiaomi';
import { type PdfEngine } from './openrouter';
import { getAppSettings, getEnvSettings } from '@/actions/adminActions';
import { readAiConfig } from '@/lib/ai-config-runtime';
import { logAiApiCall } from '@/lib/logger';

export const getDefaultModel = async (): Promise<string> => {
    const aiConfig = await readAiConfig();
    const model = aiConfig.apiModels.find(m => m.isServiceModel) || aiConfig.apiModels.find(m => m.isDefault);
    return model ? model.value : aiConfig.apiModels[0]?.value || '';
};

export const getVoiceModel = async (): Promise<string> => {
    const aiConfig = await readAiConfig();
    const model = aiConfig.apiModels.find(m => m.isVoiceModel) || aiConfig.apiModels.find(m => m.canProcessAudio);
    return model ? model.value : '';
};


interface AiServiceParams {
    prompt: string;
    model: string;
    file?: { fileUri: string; mimeType: string; fileName?: string } | null;
    userId?: string;
    providerOverride?: 'openrouter' | 'local_hf' | 'xiaomi';
    // Allow any other properties to be passed
    [key: string]: any;
}

type ExecutionProvider = 'openrouter' | 'local_hf' | 'xiaomi';

const resolveExecutionProvider = async (params: AiServiceParams): Promise<ExecutionProvider> => {
    if (params.providerOverride) {
        return params.providerOverride;
    }
    const aiConfig = await readAiConfig();
    const modelInfo = aiConfig.apiModels.find(m => m.value === params.model);
    if (modelInfo?.provider === 'xiaomi') {
        return 'xiaomi';
    }
    const appSettings = await getAppSettings();
    if (appSettings.aiExecutionProvider === 'local_hf' && appSettings.localHfEnabled) {
        return 'local_hf';
    }
    return 'openrouter';
};

const extractTextFromLocalResponse = (rawResponse: any): string | null => {
    return (
        rawResponse?.choices?.[0]?.message?.content ??
        rawResponse?.output_text ??
        rawResponse?.generated_text ??
        rawResponse?.text ??
        null
    );
};

async function generateLocalHfJson(params: AiServiceParams & { processedPrompt: string; responseMimeType?: "application/json" | "text/plain" }) {
    const envSettings = await getEnvSettings({ allowInternal: true });
    const baseUrl = envSettings.localHfBaseUrl || process.env.LOCAL_HF_BASE_URL;
    const apiKey = envSettings.localHfApiKey || process.env.LOCAL_HF_API_KEY;
    const modelId = envSettings.localHfModelId || process.env.LOCAL_HF_MODEL_ID || params.model;
    const userId = params.userId || 'anonymous';

    if (!baseUrl) {
        throw new Error('Local HF base URL не настроен. Укажите localHfBaseUrl в админке.');
    }
    if (params.file) {
        throw new Error('Local HF провайдер пока не поддерживает прямой file input. Используйте markdown/text режим.');
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const requestBody: Record<string, any> = {
        model: modelId,
        temperature: params.temperature,
        messages: [{ role: 'user', content: params.processedPrompt }],
    };
    if (params.responseMimeType === 'application/json') {
        requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
    });
    const rawResponse = await response.json().catch(async () => ({ rawText: await response.text() }));
    if (!response.ok) {
        await logAiApiCall({
            userId,
            model: modelId,
            provider: 'local_hf',
            status: 'error',
            errorMessage: `Local HF API error: ${response.status}`,
            details: { rawPrompt: params.processedPrompt },
            rawResponse,
        });
        throw new Error(`Local HF API error: ${response.status}`);
    }

    const text = extractTextFromLocalResponse(rawResponse);
    await logAiApiCall({
        userId,
        model: modelId,
        provider: 'local_hf',
        status: 'success',
        promptTokens: rawResponse?.usage?.prompt_tokens,
        completionTokens: rawResponse?.usage?.completion_tokens,
        totalTokens: rawResponse?.usage?.total_tokens,
        totalCost: rawResponse?.usage?.cost,
        details: { rawPrompt: params.processedPrompt },
        rawResponse,
    });

    return {
        text,
        thoughts: null,
        rawResponse,
        modelId,
        baseUrl,
    };
}

/**
 * Central service to generate content via OpenRouter.
 * This is for non-streaming, JSON-focused responses.
 */
export async function generateJson(params: AiServiceParams & { responseMimeType?: "application/json" | "text/plain", pdfEngine?: PdfEngine, stream?: boolean }): Promise<{ text: string | null; thoughts: string | null; rawResponse: any; requestDetails: any; }> {
    const aiConfig = await readAiConfig();
    const finalModelId = params.model;
    const modelInfo = aiConfig.apiModels.find(m => m.value === finalModelId);
    if (!modelInfo) throw new Error(`Model configuration for ${finalModelId} not found.`);
    
    let processedPrompt = params.prompt;
    if (params.items) {
        const itemsString = JSON.stringify(params.items, null, 2);
        processedPrompt = processedPrompt.replace('{{items}}', itemsString);
    }
    if (processedPrompt.includes('{{groupedItems}}')) {
        const groupedItemsString = JSON.stringify(params.groupedItems || [], null, 2);
        processedPrompt = processedPrompt.replace('{{groupedItems}}', groupedItemsString);
    }
    if (processedPrompt.includes('{{analysisDetails}}')) {
        const analysisDetailsString = JSON.stringify(params.analysisDetails || null, null, 2);
        processedPrompt = processedPrompt.replace('{{analysisDetails}}', analysisDetailsString);
    }
    if (processedPrompt.includes('{{quoteConfig}}')) {
        const quoteConfigString = JSON.stringify(params.quoteConfig || null, null, 2);
        processedPrompt = processedPrompt.replace('{{quoteConfig}}', quoteConfigString);
    }
    if (processedPrompt.includes('{{calculatorInputs}}')) {
        const calculatorInputsString = JSON.stringify(params.calculatorInputs || null, null, 2);
        processedPrompt = processedPrompt.replace('{{calculatorInputs}}', calculatorInputsString);
    }
    if (params.totalSmrCost !== undefined) {
        processedPrompt = processedPrompt.replace('{{totalSmrCost}}', String(params.totalSmrCost));
    }
     if (params.currency) {
        processedPrompt = processedPrompt.replace('{{currency}}', params.currency);
    }
    if (processedPrompt.includes('{{ocrMarkdown}}')) {
        processedPrompt = processedPrompt.replace('{{ocrMarkdown}}', params.ocrMarkdown || '');
    }

    const executionProvider = await resolveExecutionProvider(params);
    if (executionProvider === 'local_hf') {
        const localResult = await generateLocalHfJson({
            ...params,
            processedPrompt,
        });
        const requestDetails = {
            prompt: processedPrompt,
            model: localResult.modelId,
            provider: 'local_hf',
            baseUrl: localResult.baseUrl,
        };
        return {
            text: localResult.text,
            thoughts: null,
            rawResponse: localResult.rawResponse,
            requestDetails,
        };
    }

    if (executionProvider === 'xiaomi') {
        const xiaomiResult = await xiaomiService.generateXiaomiContent({
            ...params,
            prompt: processedPrompt,
            modelInfo,
            stream: false,
        });
        const requestDetails = {
            prompt: processedPrompt,
            model: finalModelId,
            provider: 'xiaomi',
            baseUrl: process.env.XIAOMI_DEFAULT_ENDPOINT || 'https://token-plan-sgp.xiaomimimo.com/v1',
        };
        return {
            text: xiaomiResult.text,
            thoughts: xiaomiResult.thoughts,
            rawResponse: xiaomiResult.rawResponse,
            requestDetails,
        };
    }

    const providerInfo = aiConfig.providers.openrouter;
    const requestDetails = {
        prompt: processedPrompt,
        model: finalModelId,
        provider: 'openrouter',
        baseUrl: providerInfo.baseUrl,
    };
    const finalParams = { ...params, prompt: processedPrompt };
    const openRouterResult = await openRouterService.generateOpenRouterContent({
        ...finalParams,
        modelInfo,
        stream: false,
        baseUrl: providerInfo.baseUrl,
    });
    const result = {
        text: openRouterResult.rawResponse.choices[0]?.message?.content ?? null,
        thoughts: openRouterResult.thoughts,
        rawResponse: openRouterResult.rawResponse,
    };

    // Return a consistent structure
    return { 
        text: result.text,
        thoughts: result.thoughts, 
        rawResponse: result.rawResponse, 
        requestDetails 
    };
}


/**
 * Central service to generate a stream via OpenRouter.
 */
export async function generateStream(params: AiServiceParams & { responseMimeType?: "application/json" | "text/plain", pdfEngine?: PdfEngine }): Promise<Response> {
     const aiConfig = await readAiConfig();
     const finalModelId = params.model;
     const providerInfo = aiConfig.providers.openrouter;
     const modelInfo = aiConfig.apiModels.find(m => m.value === finalModelId);
     if (!modelInfo) throw new Error(`Model configuration for ${finalModelId} not found.`);
     const executionProvider = await resolveExecutionProvider(params);
     if (executionProvider === 'local_hf') {
         throw new Error('Streaming для local_hf пока не поддерживается. Используйте OpenRouter или non-stream режим.');
     }
     if (executionProvider === 'xiaomi') {
         return xiaomiService.generateXiaomiContentStreamed({ ...params, model: finalModelId, modelInfo, stream: true });
     }
     return openRouterService.generateOpenRouterContentStreamed({ ...params, model: finalModelId, modelInfo, baseUrl: providerInfo.baseUrl });
}


/**
 * Двухэтапный пайплайн: PDF → OCR (OpenRouter, бесплатно) → markdown → анализ (Xiaomi).
 *
 * Этап 1: Отправляем PDF в OpenRouter с бесплатной моделью + mistral-ocr → получаем markdown.
 * Этап 2: Отправляем markdown в Xiaomi MiMo для финального анализа → получаем JSON.
 *
 * Используется для main-analysis и server-analysis, когда модель-анализа = Xiaomi.
 */
export async function generateWithOcrPipeline(params: {
  prompt: string;
  model: string;              // модель для анализа (например mimo-v2.5-pro)
  file: { fileUri: string; mimeType: string; fileName?: string };
  userId?: string;
  temperature?: number;
  includeThoughts?: boolean;
  pdfEngine?: PdfEngine;
  responseMimeType?: "application/json" | "text/plain";
}): Promise<{
  text: string | null;
  thoughts: string | null;
  rawResponse: any;
  requestDetails: any;
  ocrMarkdown?: string;
  _pipelineLog?: PipelineStageLog[];
}> {
  const aiConfig = await readAiConfig();
  const userId = params.userId || 'anonymous';

  // Пробуем отправить PDF в OpenRouter.
  // Стратегия: URL напрямую → если 500, пробуем base64 (файлы < 10MB).
  let ocrFile = params.file;
  const MAX_BASE64_BYTES = 10 * 1024 * 1024;

  // --- Этап 1: OCR (извлечение текста из PDF) ---
  const ocrModel = aiConfig.ocrModel || 'google/gemini-2.5-flash-lite';
  const ocrProviderId = aiConfig.ocrProvider || 'openrouter';
  const ocrProviderInfo = aiConfig.providers[ocrProviderId] || aiConfig.providers.openrouter;
  const ocrModelInfo = aiConfig.apiModels.find(m => m.value === ocrModel) || {
    value: ocrModel,
    label: ocrModel,
    provider: 'openrouter',
    pdfEngineOverride: 'none',
  };

  // Определяем PDF engine: cloudflare-ai (бесплатный) → native → mistral-ocr
  const enginesToTry: PdfEngine[] = ['cloudflare-ai', 'native', 'mistral-ocr'];
  const resolvedEngine = params.pdfEngine && params.pdfEngine !== 'auto'
    ? params.pdfEngine
    : (enginesToTry[0] || 'pdf-text');

  // --- Структурированное логирование этапов ---
  interface PipelineStageLog {
    stage: string;
    engine?: string;
    model?: string;
    provider?: string;
    endpoint?: string;
    fileMode?: string;
    status: 'ok' | 'error' | 'skip';
    requestSummary?: string;
    responseSummary?: string;
    error?: string;
    durationMs?: number;
    timestamp: string;
  }
  const pipelineLog: PipelineStageLog[] = [];
  const logStage = (entry: Omit<PipelineStageLog, 'timestamp'>) => {
    const full: PipelineStageLog = { ...entry, timestamp: new Date().toISOString() };
    pipelineLog.push(full);
    const icon = entry.status === 'ok' ? '✅' : entry.status === 'error' ? '❌' : '⏭️';
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Pipeline] ${icon} ${entry.stage} | engine=${entry.engine || '-'} | status=${entry.status}`);
    }
  };

  logStage({
    stage: 'Пайплайн запущен',
    model: ocrModel,
    provider: ocrProviderId,
    status: 'ok',
    responseSummary: `${ocrModel} → ${enginesToTry.join(' → ')}`,
  });

  const ocrPrompt = `## РОЛЬ И ЗАДАЧА
Ты — OCR-парсер проектной документации. Извлеки ВЕСЬ текст из документа и верни его в markdown.

## ПРАВИЛА
1. Сохраняй структуру документа: заголовки, списки, таблицы, разделы, подписи к схемам.
2. Таблицы передавай markdown-таблицами.
3. Если это схемы/чертежи/подписи, передавай текст как отдельные блоки с понятными заголовками.
4. Ничего не выдумывай, не добавляй пояснения от себя.
5. Если фрагмент нечитабелен, помечай [неразборчиво].

## ФОРМАТ ОТВЕТА
- Верни ТОЛЬКО markdown.
- Без JSON.
- Без markdown-кода в тройных кавычках.
- Без комментариев до и после.`;

  let ocrMarkdown = '';
  let ocrRawResponse: any = null;
  const ocrErrors: string[] = [];
  let triedBase64 = false;

  const tryOcrWithFile = async (file: typeof ocrFile, fileMode: string) => {
    for (const engine of [resolvedEngine, ...enginesToTry.filter(e => e !== resolvedEngine)]) {
      const startTime = Date.now();
      try {
        const ocrResult = await openRouterService.generateOpenRouterContent({
          prompt: ocrPrompt,
          modelInfo: ocrModelInfo,
          file,
          temperature: 0,
          userId,
          responseMimeType: 'text/plain',
          pdfEngine: engine,
          stream: false,
          baseUrl: ocrProviderInfo.baseUrl,
        });

        const durationMs = Date.now() - startTime;
        const rawText = ocrResult.rawResponse?.choices?.[0]?.message?.content ?? ocrResult.text ?? '';
        ocrMarkdown = rawText.trim();
        ocrRawResponse = ocrResult.rawResponse;

        const fenceMatch = ocrMarkdown.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/i);
        if (fenceMatch) {
          ocrMarkdown = fenceMatch[1].trim();
        }

        if (ocrMarkdown.length > 50) {
          logStage({
            stage: `OCR [${engine}]`,
            engine,
            fileMode,
            status: 'ok',
            durationMs,
            responseSummary: `${ocrMarkdown.length} символов`,
          });
          return true;
        }

        const shortMsg = `Слишком короткий ответ (${ocrMarkdown.length} символов)`;
        ocrErrors.push(`[${engine}] ${shortMsg}`);
        logStage({
          stage: `OCR [${engine}]`,
          engine,
          fileMode,
          status: 'error',
          durationMs,
          error: shortMsg,
        });
      } catch (error: any) {
        const durationMs = Date.now() - startTime;
        // Извлекаем чистое сообщение без дублирования [engine]
        const cleanMsg = error.message?.replace(new RegExp(`^\\[${engine}\\]\\s*`), '') || error.message;
        ocrErrors.push(`[${engine}] ${cleanMsg}`);
        logStage({
          stage: `OCR [${engine}]`,
          engine,
          fileMode,
          status: 'error',
          durationMs,
          error: cleanMsg,
        });
        continue;
      }
    }
    return false;
  };

  // Попытка 1: отправляем URL как есть
  const urlSuccess = await tryOcrWithFile(ocrFile, 'url');

  // Попытка 2: если все 500 и файл — URL, конвертируем в base64 и пробуем снова
  if (!urlSuccess && !triedBase64 && ocrFile.fileUri && !ocrFile.fileUri.startsWith('data:')) {
    try {
      const fileResponse = await fetch(ocrFile.fileUri);
      if (fileResponse.ok) {
        const arrayBuffer = await fileResponse.arrayBuffer();
        const sizeKb = Math.round(arrayBuffer.byteLength / 1024);
        if (arrayBuffer.byteLength <= MAX_BASE64_BYTES) {
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          ocrFile = { ...ocrFile, fileUri: `data:${ocrFile.mimeType};base64,${base64}` };
          triedBase64 = true;
          await tryOcrWithFile(ocrFile, 'base64');
        } else {
          logStage({
            stage: 'base64 пропущен',
            fileMode: 'url→base64',
            status: 'skip',
            error: `Файл слишком большой: ${sizeKb}KB (макс 10MB)`,
          });
        }
      } else {
        logStage({
          stage: 'base64: не удалось загрузить',
          fileMode: 'url→base64',
          status: 'error',
          error: `HTTP ${fileResponse.status}`,
        });
      }
    } catch (e: any) {
      ocrErrors.push(`[base64-conversion] ${e.message}`);
    }
  }

  if (!ocrMarkdown || ocrMarkdown.length < 50) {
    logStage({
      stage: 'OCR не выполнен',
      status: 'error',
      error: ocrErrors.join(' | '),
    });
    const errorMsg = `OCR этап не выполнен. Ошибки: ${ocrErrors.join(' | ')}`;
    const pipelineError = new Error(errorMsg) as any;
    pipelineError._pipelineLog = pipelineLog;
    throw pipelineError;
  }

  await logAiApiCall({
    userId,
    model: ocrModel,
    provider: ocrProviderId as any,
    status: 'success',
    details: { stage: 'ocr', markdownLength: ocrMarkdown.length, engines_tried: ocrErrors.length + 1 },
  });

  logStage({
    stage: 'OCR выполнен',
    status: 'ok',
    responseSummary: `${ocrMarkdown.length} символов`,
  });

  // --- Этап 2: Анализ markdown ---
  const analysisModelId = params.model || aiConfig.analysisModel;
  const analysisModelInfo = aiConfig.apiModels.find(m => m.value === analysisModelId);
  if (!analysisModelInfo) {
    throw new Error(`Модель ${analysisModelId} не найдена в конфигурации.`);
  }

  const analysisProvider = analysisModelInfo.provider || aiConfig.analysisProvider || 'openrouter';
  const analysisEndpoint = analysisProvider === 'xiaomi'
    ? (aiConfig.providers.xiaomi?.baseUrl || 'xiaomi-direct')
    : (aiConfig.providers.openrouter?.baseUrl || 'openrouter');

  logStage({
    stage: 'Анализ',
    model: analysisModelId,
    provider: analysisProvider,
    status: 'ok',
    responseSummary: `${analysisModelId} через ${analysisProvider}`,
  });

  // Подставляем OCR markdown в промпт
  let processedPrompt = params.prompt;
  if (processedPrompt.includes('{{ocrMarkdown}}')) {
    processedPrompt = processedPrompt.replace('{{ocrMarkdown}}', ocrMarkdown);
  } else {
    // Если промпт не содержит плейсхолдер, добавляем markdown в конец
    processedPrompt = `${processedPrompt}\n\n## OCR MARKDOWN\n${ocrMarkdown}`;
  }

  const analysisParams = {
    prompt: processedPrompt,
    model: params.model,
    temperature: params.temperature ?? 0.2,
    includeThoughts: params.includeThoughts ?? false,
    userId,
    responseMimeType: params.responseMimeType || 'application/json' as const,
  };

  let analysisResult: { text: string | null; thoughts: string | null; rawResponse: any };

  const analysisStart = Date.now();
  try {
    if (analysisProvider === 'xiaomi') {
      analysisResult = await xiaomiService.generateXiaomiContent({
        ...analysisParams,
        modelInfo: analysisModelInfo,
        stream: false,
      });
    } else {
      const providerInfo = aiConfig.providers.openrouter;
      analysisResult = await openRouterService.generateOpenRouterContent({
        ...analysisParams,
        modelInfo: analysisModelInfo,
        stream: false,
        baseUrl: providerInfo.baseUrl,
      });
    }

    const analysisDuration = Date.now() - analysisStart;
    const responseLen = analysisResult.text?.length || 0;
    logStage({
      stage: 'Анализ',
      model: analysisModelId,
      provider: analysisProvider,
      status: responseLen > 0 ? 'ok' : 'error',
      durationMs: analysisDuration,
      responseSummary: responseLen > 0 ? `${responseLen} символов` : 'Пустой ответ',
    });
  } catch (analysisError: any) {
    const analysisDuration = Date.now() - analysisStart;
    logStage({
      stage: 'Анализ',
      model: analysisModelId,
      provider: analysisProvider,
      status: 'error',
      durationMs: analysisDuration,
      error: analysisError.message,
    });
    const pipelineError = new Error(`Этап анализа: ${analysisError.message}`) as any;
    pipelineError._pipelineLog = pipelineLog;
    throw pipelineError;
  }

  return {
    text: analysisResult.text,
    thoughts: analysisResult.thoughts,
    rawResponse: analysisResult.rawResponse,
    requestDetails: {
      pipeline: 'ocr-then-analyze',
      ocrModel,
      ocrProvider: ocrProviderId,
      analysisModel: analysisModelId,
      analysisProvider,
      ocrMarkdownLength: ocrMarkdown.length,
    },
    ocrMarkdown,
    _pipelineLog: pipelineLog,
  };
}
