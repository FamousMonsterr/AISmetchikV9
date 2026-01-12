// src/app/api/main-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateJson } from '@/services/ai';

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
  try {
    const body = await request.json();
    const validation = MainAnalysisRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ success: false, message: 'Invalid request body.', errors: validation.error.flatten() }, { status: 400 });
    }
    
    const analysisInput = validation.data;
    
    // Use the central router function, which handles all providers
    const { text, rawResponse } = await generateJson(analysisInput);

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
    
    return NextResponse.json(finalJsonResponse, { status: 200 });

  } catch (error: any) {
    console.error('[Main Analysis API Route Error]', error);
    const errorMessage = error.message || 'An unknown server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
