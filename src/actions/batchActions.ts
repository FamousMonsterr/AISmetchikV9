// src/actions/batchActions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, runTransaction, writeBatch, updateDoc } from '@/lib/mongoFirestoreServer';
import { getUserPriceBase } from './userActions';
import { suggestPrivatePricesFlow } from '@/ai/flows/suggest-private-prices-flow';
import { logUserAction } from '@/lib/logger';
import type { HistoryRequest, AppUser } from '@/contexts/AppContext';

const BatchPriceUpdateSchema = z.object({
  userId: z.string().min(1),
  projectIds: z.array(z.string()).min(1),
  selectedSections: z.array(z.string()),
});

export const runBatchPriceUpdate = async (data: z.infer<typeof BatchPriceUpdateSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = BatchPriceUpdateSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные для пакетного обновления.' };
  }
  
  const { userId, projectIds, selectedSections } = validation.data;

  try {
    // Transaction to check credits and deduct them
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error('Пользователь не найден.');
      
      const cost = projectIds.length;
      const currentCredits = (userDoc.data() as AppUser).credits || 0;
      if (currentCredits < cost) {
        throw new Error(`Недостаточно кредитов. Требуется: ${cost}, доступно: ${currentCredits}.`);
      }
      
      // Deduct credits
      transaction.update(userRef, { credits: currentCredits - cost });
      
      await logUserAction(userId, 'CREDIT_DEDUCTION', { 
          amount: cost, 
          reason: 'Batch Price Update', 
          projectCount: projectIds.length,
          newBalance: currentCredits - cost 
      });
    });

    // Get user's price base
    const priceBaseItems = await getUserPriceBase(userId);
    const filteredPriceBase = priceBaseItems.filter(item => selectedSections.includes(item.section || 'Без раздела'));
    
    let updatedProjectsCount = 0;

    // Process each project
    for (const projectId of projectIds) {
      const projectRef = doc(db, 'requests', projectId);
      const projectDoc = await getDoc(projectRef);
      if (!projectDoc.exists()) continue;

      const projectData = projectDoc.data() as HistoryRequest;
      
      // We need to run two separate flows for material and installation
      const resultMaterial = await suggestPrivatePricesFlow({
        itemsToPrice: projectData.outputSpecifications,
        priceBaseItems: filteredPriceBase,
        priceTypeToSuggest: 'material',
      });
      
      const resultInstallation = await suggestPrivatePricesFlow({
        itemsToPrice: resultMaterial.pricedItems, // use items priced with materials
        priceBaseItems: filteredPriceBase,
        priceTypeToSuggest: 'installation',
      });
      
      await updateDoc(projectRef, { outputSpecifications: resultInstallation.pricedItems });
      updatedProjectsCount++;
    }
    
    await logUserAction(userId, 'BATCH_PRICE_UPDATE', { 
        projectIds, 
        updatedCount: updatedProjectsCount, 
        selectedSections 
    });

    return { success: true, message: `Обработка завершена. Обновлено ${updatedProjectsCount} из ${projectIds.length} проектов.` };

  } catch (error: any) {
    console.error("Batch price update error:", error);
    return { success: false, message: error.message || "Произошла неизвестная ошибка." };
  }
};
