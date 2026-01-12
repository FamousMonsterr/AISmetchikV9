
'use server';
/**
 * @fileOverview An AI flow to find items in a project document that might have been missed
 * during the initial analysis. It compares the document against a list of already found items.
 */
import { generateJson } from '@/services/ai';
import constructorConfig from '@/lib/ai-constructor-config.json';
import { z } from 'zod';
import { AiSpecificationItemSchema, ExtractProjectSpecificationsOutputSchema } from '../genkit-schemas';

// --- Input Schema ---
const ItemToIgnoreSchema = z.object({
  n: z.string(),
  m: z.string().optional().nullable(),
  q: z.number().optional().nullable(),
});
export type ItemToIgnore = z.infer<typeof ItemToIgnoreSchema>;

export interface FindMissingItemsInput {
  fileUri: string;
  mimeType: string;
  fileName?: string;
  existingItems: ItemToIgnore[];
  model: string; // Model is now required
  userId: string;
}

// --- Output Schema ---
export type FindMissingItemsOutput = {
    newlyFoundItems: z.infer<typeof AiSpecificationItemSchema>[];
};

const findMissingPromptConfig = constructorConfig.prompts.find(p => p.id === 'findMissingItemsPrompt');
if (!findMissingPromptConfig) {
    throw new Error("Find missing items prompt configuration not found in ai-constructor-config.json");
}
const BASE_PROMPT = findMissingPromptConfig.promptText;

export async function findMissingItemsFlow(input: FindMissingItemsInput): Promise<FindMissingItemsOutput> {

  // Prepare the list of existing items for the prompt
  const existingItemsString = JSON.stringify(input.existingItems, null, 2);
  
  const finalPrompt = BASE_PROMPT.replace('{{existingItems}}', existingItemsString);

  const fileData = { fileUri: input.fileUri, mimeType: input.mimeType, fileName: input.fileName };

  // Generate content using the centralized AI service
  const result = await generateJson({
    prompt: finalPrompt,
    file: fileData,
    model: input.model,
    userId: input.userId,
  });
  
  const resultText = result.text;
  if (resultText === null) {
      throw new Error("AI не вернул валидный текстовый ответ для поиска пропущенных позиций.");
  }
    
  let parsedOutput: any;
  try {
    // We expect the same format as mainAnalysis, so we use its schema
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
    if (!jsonMatch || (!jsonMatch[1] && !jsonMatch[2])) {
      // If no markdown block, try parsing the whole string directly
      parsedOutput = JSON.parse(resultText);
    } else {
      const jsonString = jsonMatch[1] || jsonMatch[2];
      parsedOutput = JSON.parse(jsonString);
    }
    
    const validationResult = ExtractProjectSpecificationsOutputSchema.safeParse(parsedOutput);
    if (!validationResult.success) {
      console.error("Zod validation failed for find-missing response:", validationResult.error);
      throw new Error(`AI вернул данные в неверном формате. Детали: ${JSON.stringify(validationResult.error.flatten())}`);
    }
    
    return { newlyFoundItems: validationResult.data.items || [] };

  } catch (e: any) {
    console.error("Failed to parse OpenRouter response for missing items:", e, "Raw text:", resultText);
    throw new Error(`AI вернул данные о пропущенных позициях в невалидном формате. Детали: ${e.message}`);
  }
}
