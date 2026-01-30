// src/ai/flows/suggest-item-prices-flow.ts
// @ts-nocheck
'use server';
/**
 * @fileOverview An AI flow to suggest market prices for low-voltage system specification items.
 * This flow now calls the central AI service.
 */

import { z } from 'zod';
import { generateJson } from '@/services/ai'; 
import constructorConfig from '@/lib/ai-constructor-config.json';
import { 
    SuggestItemPricesInputSchema, 
    SuggestItemPricesOutputSchema, 
    type SuggestItemPricesInput, 
    type SuggestItemPricesOutput 
} from '@/ai/genkit-schemas';

const suggestPricesPromptConfig = constructorConfig.prompts.find(p => p.id === 'suggestPricesPrompt');
if (!suggestPricesPromptConfig) {
    throw new Error("Suggest prices prompt configuration not found in ai-constructor-config.json");
}
const BASE_PROMPT = suggestPricesPromptConfig.promptText;


function buildPrompt(input: SuggestItemPricesInput): string {
    let prompt = BASE_PROMPT;
    
    const itemsString = input.items.map(item => 
        `- ID: ${item.id}, Name: ${item.name}, Model: ${item.model || ''}, Brand: ${item.brand || ''}, Unit: ${item.unit}, Quantity: ${item.quantity}, ItemType: ${item.itemType || 'device'}`
    ).join('\n');

    prompt = prompt.replace('{{currency}}', input.currency || 'RUB');
    prompt = prompt.replace('{{items}}', itemsString);
    prompt = prompt.replace('{{totalSmrCost}}', String(input.totalSmrCost || '0'));
    
    return prompt;
}


export async function suggestItemPrices(input: SuggestItemPricesInput): Promise<SuggestItemPricesOutput> {
  // We validate here inside the server action
  const validatedInput = SuggestItemPricesInputSchema.parse(input);
  const prompt = buildPrompt(validatedInput);

  // Directly use the imported generateJson function
  const result = await generateJson({
    prompt: prompt,
    model: validatedInput.model,
  });
  
  const resultText = result.text;

  try {
    if (!resultText) {
      throw new Error("AI вернул пустой или невалидный JSON для ценовых предложений.");
    }
    
    const parsedOutput = JSON.parse(resultText);

    // Validate with Zod before returning
    return SuggestItemPricesOutputSchema.parse(parsedOutput);

  } catch (error: any) {
    console.error("Failed to parse or validate price suggestion response:", error, "Raw text:", resultText);
    if (error instanceof z.ZodError) {
        throw new Error(`AI не смог предоставить валидный ответ для ценовых предложений. Детали: ${JSON.stringify(error.flatten())}`);
    }
    throw error;
  }
}
