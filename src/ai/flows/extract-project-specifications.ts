
'use server';
/**
 * @fileOverview DEPRECATED. This flow is no longer used and is superseded by main-analysis-flow.ts.
 * Kept for historical reference.
 */

import { z } from 'zod';
import { nanoid } from "nanoid";
import { 
  ExtractProjectSpecificationsOutputSchema, 
  type ExtractProjectSpecificationsOutput,
} from '@/ai/genkit-schemas';

const ExtractProjectSpecificationsInputSchema = z.object({
  extractedText: z.string().describe("The text previously extracted from the document by an OCR service."),
  modelOverride: z.string().optional().describe("Optional model name to override the default for the analysis part."),
});
export type ExtractProjectSpecificationsInput = z.infer<typeof ExtractProjectSpecificationsInputSchema>;
export type { ExtractProjectSpecificationsOutput };

export async function extractProjectSpecifications(input: ExtractProjectSpecificationsInput): Promise<ExtractProjectSpecificationsOutput> {
    console.warn("DEPRECATED: extractProjectSpecifications is called, but should be replaced by mainAnalysisFlow.");
    
    // Return a dummy response
    return {
        analysis: {},
        items: [],
        aiGeneralComment: "This flow is deprecated."
    }
}
