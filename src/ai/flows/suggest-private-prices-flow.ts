
// @ts-nocheck
'use server';
/**
 * @fileOverview An AI flow that suggests prices
 * based on a user's private price database.
 * This implementation uses strict matching rules.
 */

import { z } from 'zod';
import type { SpecificationItem, PriceBaseItem } from '@/contexts/AppContext';

// --- Input Schema ---
const SuggestPrivatePricesInputSchema = z.object({
  itemsToPrice: z.array(z.any()).describe("A list of items to suggest prices for."),
  priceBaseItems: z.array(z.any()).describe("A list of items from the user's private price base."),
  priceTypeToSuggest: z.enum(['material', 'installation']).describe("The type of price to suggest."),
});
export type SuggestPrivatePricesInput = z.infer<typeof SuggestPrivatePricesInputSchema>;

// --- Output Schema ---
const SuggestPrivatePricesOutputSchema = z.object({
  pricedItems: z.array(z.any()).describe("The list of items with their suggested prices based on the user's private data."),
});
export type SuggestPrivatePricesOutput = z.infer<typeof SuggestPrivatePricesOutputSchema>;


// A simple text similarity function (Jaro-Winkler) for finding matches
function jaroWinkler(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;

    let len1 = s1.length, len2 = s2.length;
    if (len1 === 0 || len2 === 0) return 0.0;

    const match_distance = Math.floor(Math.max(len1, len2) / 2) - 1;
    const s1_matches = new Array(len1).fill(false);
    const s2_matches = new Array(len2).fill(false);
    let matches = 0;

    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - match_distance);
        const end = Math.min(i + match_distance + 1, len2);
        for (let j = start; j < end; j++) {
            if (s2_matches[j]) continue;
            if (s1[i] !== s2[j]) continue;
            s1_matches[i] = true;
            s2_matches[j] = true;
            matches++;
            break;
        }
    }

    if (matches === 0) return 0.0;

    let t = 0;
    let k = 0;
    for (let i = 0; i < len1; i++) {
        if (!s1_matches[i]) continue;
        while (!s2_matches[k]) k++;
        if (s1[i] !== s2[k]) t++;
        k++;
    }
    t /= 2;

    const jaro = (matches / len1 + matches / len2 + (matches - t) / matches) / 3;

    let p = 0.1;
    let l = 0;
    while (s1[l] === s2[l] && l < 4) l++;
    
    return jaro + l * p * (1 - jaro);
}

/**
 * Suggests prices from a private database with strict matching rules.
 */
export async function suggestPrivatePricesFlow(input: SuggestPrivatePricesInput): Promise<SuggestPrivatePricesOutput> {
  const { itemsToPrice, priceBaseItems, priceTypeToSuggest } = input;

  const pricedItems = itemsToPrice.map((itemToPrice: SpecificationItem) => {
    if (itemToPrice.isInf) {
      return itemToPrice;
    }

    let bestMatch: PriceBaseItem | null = null;
    let matchReason = '';

    if (priceTypeToSuggest === 'material') {
      // Rule for materials: Exact model match
      if (itemToPrice.m) {
        const modelMatch = priceBaseItems.find(baseItem => 
            baseItem.model?.trim().toLowerCase() === itemToPrice.m?.trim().toLowerCase() && baseItem.model?.trim() !== ''
        );
        if (modelMatch) {
            bestMatch = modelMatch;
            matchReason = `модель: ${bestMatch.model}`;
        }
      }
    } else if (priceTypeToSuggest === 'installation') {
      // Rule for works: High similarity name match
      let highestScore = 0.85; // 85% similarity threshold
      let potentialMatch: PriceBaseItem | null = null;
      
      for (const baseItem of priceBaseItems) {
          const score = jaroWinkler(
              itemToPrice.n.toLowerCase(), 
              baseItem.name.toLowerCase()
          );
          
          if (score > highestScore) {
              highestScore = score;
              potentialMatch = baseItem;
          }
      }
      if (potentialMatch) {
          bestMatch = potentialMatch;
          matchReason = `название: ${bestMatch.name} (${(highestScore * 100).toFixed(0)}%)`;
      }
    }

    // Apply prices if a match was found
    if (bestMatch) {
      const updates: Partial<SpecificationItem> = {};
      let commentText = '';

      if (priceTypeToSuggest === 'material' && bestMatch.avgMaterialPrice) {
        updates.materialPrice = parseFloat(bestMatch.avgMaterialPrice.toFixed(2));
        commentText = `Цена мат. из базы (совпадение по ${matchReason}).`;
      }
      if (priceTypeToSuggest === 'installation' && bestMatch.avgInstallationPrice) {
        updates.installationPrice = parseFloat(bestMatch.avgInstallationPrice.toFixed(2));
        commentText = `Цена монт. из базы (совпадение по ${matchReason}).`;
      }

      if (Object.keys(updates).length > 0) {
        return {
            ...itemToPrice,
            ...updates,
            comment: (itemToPrice.comment ? itemToPrice.comment + ". " : "") + commentText,
            st: 'Утверждено',
        };
      }
    }
    
    // If no good match is found, return the item as is
    return itemToPrice;
  });

  return {
    pricedItems,
  };
}
