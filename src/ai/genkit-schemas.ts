// src/ai/genkit-schemas.ts

import { z } from 'zod';

/**
 * Schema for a single item in a project specification, using short names for AI interaction.
 */
export const AiSpecificationItemSchema = z.object({
  n: z.string().describe("Name"),
  m: z.string().optional().nullable().describe("Model/Article"),
  b: z.string().optional().nullable().describe("Brand"),
  q: z.number().describe("Quantity"),
  r: z.number().optional().nullable().describe("Reserve"),
  u: z.string().describe("Unit"),
  mp: z.number().optional().nullable().describe("Suggested material price per unit"),
  ip: z.number().optional().nullable().describe("Suggested installation price per unit"),
  c: z.string().optional().nullable().describe("AI comment for the position"),
  isInf: z.boolean().optional().nullable().describe("Is Informational/Header"),
  isRec: z.boolean().optional().nullable().describe("Is Recommended by AI"),
});

export type AiSpecificationItem = z.infer<typeof AiSpecificationItemSchema>;

/**
 * Schema for detailed project analysis by AI.
 */
export const AnalysisDetailsSchema = z.object({
    systemType: z.string().optional().nullable().describe("e.g., 'Video Surveillance and Access Control'"),
    objectName: z.string().optional().nullable().describe("e.g., 'Residential Complex Sunny'"),
    projectCode: z.string().optional().nullable().describe("The project code or cipher, e.g., '123/AB-C'"),
    maxInstallationHeight: z.string().optional().nullable().describe("e.g., 'up to 6 meters'"),
    totalArea: z.string().optional().nullable().describe("e.g., '1500 sq.m.'"),
    projectHashtags: z.array(z.string()).nullable().optional(),
});

/**
 * Schema for the complete output of the main project specification extraction flow from AI.
 */
export const ExtractProjectSpecificationsOutputSchema = z.object({
  items: z.array(AiSpecificationItemSchema).optional().nullable(),
  analysisDetails: AnalysisDetailsSchema.optional().nullable(),
  aiComment: z.string().optional().nullable(),
  aiGeneralComment: z.string().optional().nullable(),
  importantExtractionNotes: z.array(z.string()).nullable().optional(),
  consistencyIssues: z.array(z.object({
    type: z.string(),
    severity: z.enum(['low', 'medium', 'high']).optional().nullable(),
    message: z.string(),
    recommendation: z.string().optional().nullable(),
  })).optional().nullable(),
});

export type ExtractProjectSpecificationsOutput = z.infer<typeof ExtractProjectSpecificationsOutputSchema>;

// --- Schemas for Refinement Flow ---
const RefinedSpecItemBaseSchema = AiSpecificationItemSchema.extend({
  id: z.string().optional(),
  splitFromId: z.string().optional(),
});

export const RefineItemsOutputSchema = z.object({
  refinedSpecifications: z.array(RefinedSpecItemBaseSchema),
  aiRefinementComment: z.string().optional().nullable(),
});

// --- Schema for Legal Entity ---
export const LegalEntitySchema = z.object({
    name: z.string().min(1, 'Название компании не может быть пустым'),
    legalAddress: z.string().optional(),
    inn: z.string().optional(),
    kpp: z.string().optional(),
    checkingAccount: z.string().optional(),
    bankName: z.string().optional(),
    correspondentAccount: z.string().optional(),
    bik: z.string().optional(),
    ceoName: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email({ message: "Неверный формат email." }).optional().or(z.literal('')),
});
export type LegalEntity = z.infer<typeof LegalEntitySchema>;


// --- Schemas for Price Suggestion Flow ---
const ItemToPriceSchema = z.object({
  id: z.string().describe('The unique identifier of the item.'),
  name: z.string().describe('The name of the item or work.'),
  model: z.string().optional().nullable().default('').describe('The model/article of the item, if available.'),
  brand: z.string().optional().nullable().default('').describe('The brand of the item, if available.'),
  unit: z.string().describe('The unit of measurement for the item/work.'),
  quantity: z.number().describe('The quantity of the item.'),
  itemType: z.enum(['device', 'cable', 'cable_support', 'consumable', 'other']).optional().describe('Preset item category from the project, if available.'),
});


export const SuggestItemPricesInputSchema = z.object({
  items: z.array(ItemToPriceSchema)
    .describe('A list of specification items for which to suggest prices.'),
  currency: z.string().default('RUB').describe('The currency for the suggested prices (e.g., RUB, USD).'),
  priceTypeToSuggest: z.enum(['material', 'installation']).optional().describe("Type of price to suggest. If 'material', suggest only material prices. If 'installation', suggest only installation prices. If not provided, AI can decide or suggest both if applicable based on item nature."),
  model: z.string().optional().describe("The AI model to use for the suggestion."),
  totalSmrCost: z.number().optional().describe("The total installation cost (СМР) to be distributed among the items."),
});
export type SuggestItemPricesInput = z.infer<typeof SuggestItemPricesInputSchema>;

const PricedItemSchema = z.object({
  id: z.string().describe('The unique identifier of the item, matching the input.'),
  suggestedMaterialPrice: z.number().optional().nullable().describe('Suggested market price for one unit of the material in the specified currency. Provide only if material prices were requested or if no specific type was requested.'),
  suggestedInstallationPrice: z.number().optional().nullable().describe('Suggested market price for installation of one unit of the item in the specified currency. Provide only if installation prices were requested or if no specific type was requested.'),
  aiPriceComment: z.string().optional().describe('A brief comment from AI about the price suggestion for this item, if any (e.g., "Оптовая цена", "Премиум сегмент"). Max 30 chars, Russian.'),
});

export const SuggestItemPricesOutputSchema = z.object({
  pricedItems: z.array(PricedItemSchema)
    .describe('The list of items with their suggested prices and comments.'),
  overallAiComment: z.string().optional().describe('A general comment from AI about the pricing process, if any. Max 50 chars, Russian.')
});
export type SuggestItemPricesOutput = z.infer<typeof SuggestItemPricesOutputSchema>;
