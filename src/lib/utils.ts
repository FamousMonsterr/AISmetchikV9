// @ts-nocheck
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SpecificationItem, AiSpecificationItem, ItemType } from '@/contexts/AppContext';
import { nanoid } from "nanoid";
import { classifyItemType } from '@/lib/item-type-classifier';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// This function is now the single source of truth for converting AI's short-key format to our app's long-key format.
export function hydrateSpecificationsForDB(aiItems: AiSpecificationItem[], isRecommended = false): SpecificationItem[] {
  if (!Array.isArray(aiItems)) return [];
  
  return aiItems.map(item => {
    const unit = item.u || 'шт';
    const itemType: ItemType = classifyItemType(item.n, unit);

    // New status logic
    const status: SpecificationItem['status'] = itemType === 'other' ? 'На утверждение' : 'Утверждено';

    return {
        id: nanoid(),
        name: item.n || "Без названия",
        model: item.m || null,
        brand: item.b || null,
        quantityToInstall: item.q || 0,
        quantityReserve: item.r || null,
        unit: unit,
        isInformational: item.isInf || false,
        isRecommended: isRecommended,
        status: status,
        itemType: itemType,
    }
  });
}

export const getFileSha1 = async (file: { arrayBuffer: () => Promise<ArrayBuffer> }): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export function getDataAndMimeType(dataUri: string): [string, string] {
    const parts = dataUri.split(',');
    if (parts.length !== 2) throw new Error('Invalid data URI');
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error('Could not determine MIME type from data URI');
    return [mimeMatch[1], parts[1]];
}
