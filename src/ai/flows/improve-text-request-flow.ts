
'use server';
/**
 * @fileOverview An AI flow to take a user's free-form text request and improve it by adding details,
 * suggesting components, models, and brands, making it ready for detailed estimation.
 *
 * - improveTextRequest - A function that takes a text request and returns an improved version.
 * - ImproveTextRequestInput - The input type for the function.
 * - ImproveTextRequestOutput - The return type for the function.
 */

import { z } from 'zod';
import { generateJson, getDefaultModel } from '@/services/ai';
import constructorConfig from '@/lib/ai-constructor-config.json';

// --- Input Schema ---
const ImproveTextRequestInputSchema = z.object({
  customerRequest: z.string().describe("A free-form text request from a customer."),
});
export type ImproveTextRequestInput = z.infer<typeof ImproveTextRequestInputSchema>;

// --- Output Schema ---
const ImproveTextRequestOutputSchema = z.object({
  improvedRequest: z.string().describe("The improved and detailed version of the customer's request as a plain text string."),
});
export type ImproveTextRequestOutput = z.infer<typeof ImproveTextRequestOutputSchema>;

const promptConfig = constructorConfig.prompts.find(p => p.id === 'improveTextRequest');
if (!promptConfig) {
    throw new Error("Improve text request prompt configuration not found in ai-constructor-config.json");
}
const PROMPT = promptConfig.promptText;

export async function improveTextRequest(input: ImproveTextRequestInput): Promise<ImproveTextRequestOutput> {
  const finalPrompt = PROMPT.replace('{{customerRequest}}', input.customerRequest);
  
  const result = await generateJson({
    prompt: finalPrompt,
    model: await getDefaultModel(),
    responseMimeType: 'text/plain',
  });
  
  const resultText = result.text;

  if (!resultText) {
    throw new Error('AI did not return an improved request.');
  }

  // Gemini может вернуть текст в кавычках или с лишними отступами
  const cleanedText = resultText.trim().replace(/^"|"$/g, '').trim();

  return { improvedRequest: cleanedText };
}
