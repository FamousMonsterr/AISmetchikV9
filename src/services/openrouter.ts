// @ts-nocheck
// src/services/openrouter.ts
'use server';

import { getEnvSettings } from '@/actions/adminActions';
import { logAiApiCall } from "@/lib/logger";
import aiConfig from '@/lib/ai-config.json';
import { Readable } from 'stream';

// --- Types ---
export type OpenRouterModel = {
    id: string;
    name: string;
    description: string;
    pricing: {
        prompt: string;
        completion: string;
        request: string;
        image: string;
    };
    context_length: number;
    architecture?: {
        modality: string;
    };
    [key: string]: any;
};

export type PdfEngine = 'auto' | 'native' | 'mistral-ocr' | 'pdf-text';

interface OpenRouterParams {
    prompt: string;
    modelInfo: typeof aiConfig.apiModels[number] & { pdfEngineOverride?: 'pdf-text' | 'mistral-ocr' | 'native' };
    temperature?: number;
    file?: { fileUri: string; mimeType: string; fileName?: string } | null;
    images?: Array<{ dataUri: string; mimeType?: string; source?: string }>;
    userId?: string;
    responseMimeType?: "application/json" | "text/plain";
    onAttempt?: (engine: PdfEngine, attempt: number) => void;
    onError?: (engine: PdfEngine, error: Error) => void;
    pdfEngine?: PdfEngine;
    stream: boolean; // Explicitly control streaming
    baseUrl: string; // Explicitly pass the base URL
}

function sanitizeProviderFilename(fileName?: string): string {
    const fallback = 'document.pdf';
    if (!fileName) return fallback;
    const trimmed = fileName.trim();
    if (!trimmed) return fallback;
    const sanitized = trimmed
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
    return sanitized || fallback;
}

// --- API Key Fetcher ---
async function getOpenRouterApiKey(): Promise<string> {
    const envSettings = await getEnvSettings({ allowInternal: true });
    const apiKey = envSettings.openRouterApiKey || process.env.OPENROUTER_API_KEY;
     if (!apiKey) {
        throw new Error(`API key for provider 'openrouter' is not configured in admin settings or environment variables.`);
    }
    return apiKey;
}


// --- Main Service Functions ---

/**
 * Fetches the list of available models from the OpenRouter API.
 */
export async function getOpenRouterModels(): Promise<OpenRouterModel[]> {
    try {
        const apiKey = await getOpenRouterApiKey();
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to fetch OpenRouter models: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error("Error in getOpenRouterModels:", error);
        throw error;
    }
}


/**
 * Internal function to attempt content generation with a specific engine.
 */
async function tryGenerateWithEngine({
    engine,
    prompt,
    modelInfo,
    temperature,
    file,
    images,
    userId,
    responseMimeType,
    stream,
    baseUrl,
}: OpenRouterParams & { engine: PdfEngine }): Promise<Response> {

    const apiKey = await getOpenRouterApiKey();
    
    const headers: HeadersInit = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aismetchik.pro',
        'X-Title': 'AI Smetchik',
    };
    
    const body: any = {
        model: modelInfo.value.replace('openrouter/', ''),
        temperature,
        stream,
    };

    const userContent: any[] = [{ type: 'text', text: prompt }];

    if (file) {
        userContent.push({
            type: 'file',
            file: {
                filename: sanitizeProviderFilename(file.fileName),
                file_data: file.fileUri,
                fileData: file.fileUri,
            },
        });
    }

    if (Array.isArray(images) && images.length > 0) {
        for (const image of images) {
            if (!image?.dataUri) continue;
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: image.dataUri,
                },
            });
        }
    }
    
    body.messages = [{ role: 'user', content: userContent }];
    if (file && file.mimeType === 'application/pdf') {
        body.plugins = [
            {
                id: 'file-parser',
                pdf: { engine },
            },
        ];
    }
    
    if (responseMimeType === 'application/json' && !stream) {
         body.response_format = { type: 'json_object' };
    }

    const response = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(body) });

    const requestId = response.headers.get('x-openrouter-request-id');
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
        const errorBody = await response.text();
        const errorMessage = `[${engine}] OpenRouter API Error: Status ${response.status}. Request ID: ${requestId || 'N/A'}. Body: ${errorBody}`;
        throw new Error(errorMessage, { cause: { body: errorBody, status: response.status, requestId } });
    }
    
    const expectedStreamType = 'text/event-stream';
    const isStreamCorrect = stream && contentType?.includes(expectedStreamType);

    if (stream && !isStreamCorrect) {
        const errorBody = await response.text();
        const errorMessage = `[${engine}] OpenRouter returned unexpected Content-Type: '${contentType}'. Expected '${expectedStreamType}'. Request ID: ${requestId || 'N/A'}. Body: ${errorBody}`;
        throw new Error(errorMessage, { cause: { body: errorBody, status: response.status, requestId } });
    }
    
    return response;
}

/**
 * Returns a ReadableStream from the OpenRouter API.
 */
export async function generateOpenRouterContentStreamed(params: OpenRouterParams): Promise<Response> {
    const providerPriority = aiConfig.providers.openrouter.pdfProcessingPriority as PdfEngine[];
    const modelOverride = params.modelInfo.pdfEngineOverride;
    const engineFromParam = params.pdfEngine;
    const resolvedEngine = engineFromParam && engineFromParam !== 'auto'
        ? engineFromParam
        : (modelOverride && modelOverride !== 'none')
            ? modelOverride
            : (providerPriority[0] || 'pdf-text');

    try {
        return await tryGenerateWithEngine({ ...params, engine: resolvedEngine, stream: true });
    } catch (error: any) {
        params.onError?.(resolvedEngine, error);
        const errorStream = new Readable({
            read() {
                this.push(`data: ${JSON.stringify({ error: error.message || "OpenRouter streaming failed." })}\n\n`);
                this.push(null);
            }
        });
        return new Response(errorStream as any, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' }
        });
    }
}

/**
 * Returns a simple text string from the OpenRouter API.
 */
export async function generateOpenRouterContent(params: OpenRouterParams): Promise<{ text: string | null; thoughts: string | null; rawResponse: any; }> {
    const { userId = 'anonymous', modelInfo } = params;
    const providerPriority = aiConfig.providers.openrouter.pdfProcessingPriority as PdfEngine[];
    const modelOverride = params.modelInfo.pdfEngineOverride;
    const engineFromParam = params.pdfEngine;

    const resolvedEngine = engineFromParam && engineFromParam !== 'auto'
        ? engineFromParam
        : (modelOverride && modelOverride !== 'none')
            ? modelOverride
            : (providerPriority[0] || 'pdf-text');
    
    const processResponse = async (response: Response) => {
        const rawResponse = await response.json();
        const responseText = rawResponse.choices?.[0]?.message?.content ?? null;
        
        await logAiApiCall({ 
            userId, model: modelInfo.value, provider: 'openrouter', status: 'success',
            promptTokens: rawResponse.usage?.prompt_tokens,
            completionTokens: rawResponse.usage?.completion_tokens,
            totalTokens: rawResponse.usage?.total_tokens,
            totalCost: rawResponse.usage?.cost,
            details: { rawPrompt: params.prompt },
            rawResponse: rawResponse,
        });
        
        if (responseText) {
            return { text: responseText, thoughts: null, rawResponse };
        } else {
            throw new Error("No content in OpenRouter response.");
        }
    };
    
    try {
        const response = await tryGenerateWithEngine({ ...params, engine: resolvedEngine, stream: false });
        return await processResponse(response);
    } catch (error: any) {
        await logAiApiCall({ 
            userId, model: modelInfo.value, provider: 'openrouter', status: 'error',
            errorMessage: error.message || "OpenRouter request failed.",
            details: { rawPrompt: params.prompt }
        });
        throw error;
    }
    
    throw new Error("OpenRouter request failed.");
}
