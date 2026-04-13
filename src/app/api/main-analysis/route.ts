// src/app/api/main-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateJson } from '@/services/ai';
import { isPdfLikeFile, parseNonPdfFileForModel } from '@/server-functions/analysis/non-pdf-parser';
import { requireAuthenticatedUser, validateRequestedUserId } from '@/lib/api-auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateFileUriAgainstAllowlist } from '@/lib/file-uri-security';
import { queueApiMetricLog } from '@/lib/api-metrics';

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

    if (analysisInput.file && !isPdfLikeFile(analysisInput.file.mimeType, analysisInput.file.fileName || 'document')) {
      const parsed = await parseNonPdfFileForModel({
        fileUri: analysisInput.file.fileUri,
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
    
    // Use the central router function, which handles all providers
    const { text, rawResponse } = await generateJson({
      ...effectiveInput,
      userId: auth.user.id,
    });

    // The 'text' from our service should already be the JSON content string.
    // However, some models might wrap it. Let's be robust.
    let finalJsonResponse;
    
    if (!text) {
        throw new Error("AI response text is null or empty.");
    }

    try {
        if (typeof text === 'object') {
            finalJsonResponse = text; // It's already a JSON object
        } else if (typeof text === 'string') {
            // First, try to parse the text directly.
            finalJsonResponse = JSON.parse(text);
        } else {
             throw new Error("Unsupported type for AI response text.");
        }
    } catch (e) {
        // If direct parsing fails, try to find a JSON block within the text.
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
    queueApiMetricLog({
      ts: new Date().toISOString(),
      endpoint: '/api/main-analysis',
      status: 500,
      durationMs: Date.now() - startedAt,
      error: errorMessage,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
