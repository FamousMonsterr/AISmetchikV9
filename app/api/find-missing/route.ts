// src/app/api/find-missing/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction, updateDoc, increment } from '@/lib/mongoFirestoreServer';
import { findMissingItemsFlow, type FindMissingItemsInput, type FindMissingItemsOutput } from '@/ai/flows/find-missing-items-flow';
import type { AiSpecificationItem } from '@/ai/genkit-schemas';
import { nanoid } from 'nanoid';

const FIND_MISSING_COST = 1;

// Schema for what the find-missing API route expects from the client
const FindMissingRequestSchema = z.object({
  userId: z.string().min(1, "ID пользователя не может быть пустым."),
  fileUri: z.string().min(1, "URI файла не может быть пустым."),
  fileName: z.string().optional(),
  mimeType: z.string().min(1, "MIME-тип файла не может быть пустым."),
  // Expects short keys from the client, as that's what the flow needs
  existingItems: z.array(z.object({
    n: z.string(),
    m: z.string().optional().nullable(),
    q: z.number().optional().nullable(),
  })),
  model: z.string().min(1, "Необходимо указать модель AI."),
  projectId: z.string().min(1),
});

// We need a function to hydrate the items for the UI, adding default fields
function hydrateNewItemsForUI(aiItems: AiSpecificationItem[]): any[] {
  if (!Array.isArray(aiItems)) return [];
  return aiItems.map(item => ({
    // Map short keys from AI to long keys for DB and UI
    id: nanoid(),
    name: item.n,
    model: item.m,
    brand: item.b,
    quantityToInstall: item.q,
    quantityReserve: item.r,
    unit: item.u,
    isInformational: item.isInf,
    // Add default UI-specific fields
    status: 'На утверждение' as const, 
    materialPrice: 0,
    installationPrice: 0,
    comment: 'Найдено AI',
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = FindMissingRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ success: false, message: 'Неверные данные запроса.', errors: validation.error.flatten() }, { status: 400 });
    }

    const { userId, fileUri, fileName, mimeType, existingItems, model: modelOverride, projectId } = validation.data;
    
    // --- Transaction to ensure atomicity ---
    const findResult = await runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userDocRef);

        if (!userDoc.exists() || (userDoc.data().credits || 0) < FIND_MISSING_COST) {
            throw new Error('Недостаточно кредитов для выполнения операции.');
        }

        const findInput: FindMissingItemsInput = {
            userId,
            fileUri,
            fileName,
            mimeType,
            existingItems, // This now matches what the flow needs
            model: modelOverride,
        };

        const findOutput: FindMissingItemsOutput = await findMissingItemsFlow(findInput);
        
        // Deduct credits only AFTER a successful AI call
        const currentCredits = userDoc.data().credits || 0;
        transaction.update(userDocRef, { credits: currentCredits - FIND_MISSING_COST });

        // Increment AI call count on the project
        const projectRef = doc(db, 'requests', projectId);
        transaction.update(projectRef, { aiCallCount: increment(1) });
        
        return findOutput;
    });

    const hydratedItems = hydrateNewItemsForUI(findResult.newlyFoundItems);

    return NextResponse.json({
        success: true,
        message: 'Поиск завершен!',
        newlyFoundItems: hydratedItems
    }, { status: 200 });
    

  } catch (error: any) {
    console.error('[Find Missing API Route Error]', error);
    const errorMessage = error.message || 'Произошла неизвестная серверная ошибка при поиске.';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
