// src/services/ai.ts
'use server';

import * as openRouterService from './openrouter';
import aiConfig from '@/lib/ai-config.json';
import { type PdfEngine } from './openrouter';

export const getDefaultModel = async (): Promise<string> => {
    const model = aiConfig.apiModels.find(m => m.isDefault);
    return model ? model.value : aiConfig.apiModels[0]?.value || '';
};


interface AiServiceParams {
    prompt: string;
    model: string;
    file?: { fileUri: string; mimeType: string; fileName?: string } | null;
    userId?: string;
    // Allow any other properties to be passed
    [key: string]: any;
}

/**
 * Central service to generate content via OpenRouter.
 * This is for non-streaming, JSON-focused responses.
 */
export async function generateJson(params: AiServiceParams & { responseMimeType?: "application/json" | "text/plain", pdfEngine?: PdfEngine, stream?: boolean }): Promise<{ text: string | null; thoughts: string | null; rawResponse: any; requestDetails: any; }> {
    const finalModelId = params.model;
    const modelInfo = aiConfig.apiModels.find(m => m.value === finalModelId);
    if (!modelInfo) throw new Error(`Model configuration for ${finalModelId} not found.`);
    const providerInfo = aiConfig.providers.openrouter;
    
    let processedPrompt = params.prompt;
    if (params.items) {
        const itemsString = JSON.stringify(params.items, null, 2);
        processedPrompt = processedPrompt.replace('{{items}}', itemsString);
    }
    if (params.totalSmrCost !== undefined) {
        processedPrompt = processedPrompt.replace('{{totalSmrCost}}', String(params.totalSmrCost));
    }
     if (params.currency) {
        processedPrompt = processedPrompt.replace('{{currency}}', params.currency);
    }

    const requestDetails = {
      prompt: processedPrompt,
      model: finalModelId,
      provider: 'openrouter',
      baseUrl: providerInfo.baseUrl,
    };
    
    const finalParams = { ...params, prompt: processedPrompt };
    
    const openRouterResult = await openRouterService.generateOpenRouterContent({ ...finalParams, modelInfo, stream: false, baseUrl: providerInfo.baseUrl });
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
     const finalModelId = params.model;
     const providerInfo = aiConfig.providers.openrouter;
     const modelInfo = aiConfig.apiModels.find(m => m.value === finalModelId);
     if (!modelInfo) throw new Error(`Model configuration for ${finalModelId} not found.`);
     return openRouterService.generateOpenRouterContentStreamed({ ...params, model: finalModelId, modelInfo, baseUrl: providerInfo.baseUrl });
}
