// @ts-nocheck
// src/services/ai.ts
'use server';

import * as openRouterService from './openrouter';
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
    providerOverride?: 'openrouter' | 'local_hf';
    // Allow any other properties to be passed
    [key: string]: any;
}

type ExecutionProvider = 'openrouter' | 'local_hf';

const resolveExecutionProvider = async (params: AiServiceParams): Promise<ExecutionProvider> => {
    if (params.providerOverride) {
        return params.providerOverride;
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
     return openRouterService.generateOpenRouterContentStreamed({ ...params, model: finalModelId, modelInfo, baseUrl: providerInfo.baseUrl });
}
