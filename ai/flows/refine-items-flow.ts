
'use server';
/**
 * @fileOverview An AI flow to refine specific items from a specification list based on user feedback.
 * It can 'refine' (re-analyze), 'split' (divide one item into many), or 'parse' (extract details from name).
 */
import { generateJson, getDefaultModel } from '@/services/ai';
import { nanoid } from "nanoid";
import constructorConfig from '@/lib/ai-constructor-config.json';
import { AiSpecificationItemSchema } from '@/ai/genkit-schemas';
import { z } from 'zod';


// --- Input Schema ---
// This now accepts a simplified version for the AI flow, matching the prompt's expectations.
const ItemToRefineSchema = z.object({
  id: z.string().optional(),
  n: z.string(),
  m: z.string().optional().nullable(),
  b: z.string().optional().nullable(),
  q: z.number().optional().nullable(),
  u: z.string().optional().nullable(),
  isInf: z.boolean().optional().nullable(),
  st: z.string(), // The status for action
  c: z.string().optional().nullable(), // For fill-empty-values to pass existing comment
});
export type ItemToRefine = z.infer<typeof ItemToRefineSchema>;


export interface RefineItemsInput {
  fileUri: string;
  mimeType: string;
  itemsToRefine: ItemToRefine[]; // Items marked for any kind of refinement
  model?: string;
  refineMode: 'refine' | 'fill-empty';
  includeThoughts?: boolean;
}


// --- Output Schema ---
// This is a more complex output that can contain updates, new items from splits, and deletions.
const RefinedSpecItemSchema = AiSpecificationItemSchema.extend({
  id: z.string().optional(), // For updated items
  splitFromId: z.string().optional(), // For newly split items
  c: z.string().optional().nullable(), // AI's comment
});

export const RefineItemsOutputSchema = z.object({
  refinedSpecifications: z.array(RefinedSpecItemSchema),
  aiRefinementComment: z.string().optional().nullable(),
});
export type RefineItemsOutput = z.infer<typeof RefineItemsOutputSchema>;


const REFINE_PROMPT_CONFIG = constructorConfig.prompts.find(p => p.id === 'refineItemsPrompt');
const FILL_EMPTY_PROMPT_CONFIG = constructorConfig.prompts.find(p => p.id === 'fillEmptyValuesPrompt');
if (!REFINE_PROMPT_CONFIG || !FILL_EMPTY_PROMPT_CONFIG) {
    throw new Error("Refinement prompt configurations not found in ai-constructor-config.json");
}

const REFINE_PROMPT_TEMPLATE = REFINE_PROMPT_CONFIG.promptText;
const FILL_EMPTY_PROMPT_TEMPLATE = FILL_EMPTY_PROMPT_CONFIG.promptText;


export async function refineItemsFlow(input: RefineItemsInput): Promise<RefineItemsOutput> {

  // Prepare the list of items to be refined for the prompt
  // The prompt still expects 'st' for context, even if it doesn't return it.
  const itemsString = JSON.stringify(input.itemsToRefine, null, 2);
  
  // Choose the right prompt based on the mode
  const finalPrompt = (input.refineMode === 'fill-empty') 
    ? FILL_EMPTY_PROMPT_TEMPLATE.replace('{{itemsToRefine}}', itemsString)
    : REFINE_PROMPT_TEMPLATE.replace('{{itemsToRefine}}', itemsString);


  // Generate content using the file URI
  const result = await generateJson({
    prompt: finalPrompt,
    file: {
        fileUri: input.fileUri,
        mimeType: input.mimeType,
        fileName: 'specification.pdf',
    },
    model: input.model || await getDefaultModel(),
    includeThoughts: input.includeThoughts,
    responseMimeType: "application/json",
  });
  
  const resultText = result.text;
  if(resultText === null) {
    throw new Error("AI не вернул текстовый ответ для уточнения.");
  }
    
  let parsedOutput: any;
  try {
    const startIndex = resultText.indexOf('{');
    const endIndex = resultText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error("No valid JSON object found in the refinement response.");
    }
    const jsonString = resultText.substring(startIndex, endIndex + 1);
    parsedOutput = JSON.parse(jsonString);

    const validationResult = RefineItemsOutputSchema.safeParse(parsedOutput);
    if (!validationResult.success) {
      console.error("Zod validation failed for refinement response:", validationResult.error);
      throw new Error(`AI returned refined data in an invalid format. Details: ${JSON.stringify(validationResult.error.flatten())}`);
    }

    return validationResult.data;

  } catch (e: any) {
    console.error("Failed to parse OpenRouter refinement response:", e, "Raw text:", resultText);
    throw new Error(`AI returned refined data in an invalid format. Details: ${e.message}`);
  }
}
