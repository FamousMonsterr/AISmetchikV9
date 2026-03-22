'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from '@/lib/db-server';
import { logUserAction } from '@/lib/logger';

type PriceBaseSpecificationItem = {
  name: string;
  model?: string | null;
  brand?: string | null;
  unit: string;
  materialPrice?: number | null;
  installationPrice?: number | null;
  itemType?: string | null;
  isInformational?: boolean | null;
};

async function resolveActingUserId(userId?: string): Promise<string> {
  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    throw new Error('Требуется авторизация.');
  }
  if (userId && userId !== sessionUserId) {
    throw new Error('Нельзя выполнять действие от имени другого пользователя.');
  }

  return sessionUserId;
}

export async function updatePriceBaseLite(
  userId: string,
  items: PriceBaseSpecificationItem[],
  section: string
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: 'Необходимо указать ID пользователя.' };
  }

  try {
    const actingUserId = await resolveActingUserId(userId);
    const batch = writeBatch(db);
    const priceBaseCol = collection(db, 'priceBaseItems');
    const existingPriceBaseSnap = await getDocs(query(priceBaseCol, where('userId', '==', actingUserId)));
    const existingItems = new Map(existingPriceBaseSnap.docs.map((entry) => [entry.data().key, entry.id]));

    for (const specItem of items) {
      if (specItem.isInformational) {
        continue;
      }

      const itemKey = `${specItem.name}|${specItem.model || ''}|${specItem.brand || ''}|${specItem.unit}`.toLowerCase();
      const dataToSave = {
        userId: actingUserId,
        key: itemKey,
        name: specItem.name,
        model: specItem.model || '',
        brand: specItem.brand || '',
        unit: specItem.unit,
        avgMaterialPrice: specItem.materialPrice || 0,
        avgInstallationPrice: specItem.installationPrice || 0,
        section,
        updatedAt: serverTimestamp(),
        itemType: specItem.itemType || 'Материал',
      };

      if (existingItems.has(itemKey)) {
        batch.update(doc(priceBaseCol, existingItems.get(itemKey)!), dataToSave as any);
      } else {
        const newItemRef = doc(priceBaseCol);
        batch.set(newItemRef, { ...dataToSave, createdAt: serverTimestamp() });
        existingItems.set(itemKey, newItemRef.id);
      }
    }

    await batch.commit();
    await logUserAction(actingUserId, 'PRICE_BASE_ITEM_UPDATE', { itemCount: items.length, section });
    return { success: true, message: `База цен успешно обновлена. Обработано ${items.length} позиций.` };
  } catch (error: any) {
    console.error('Error updating price base:', error);
    return { success: false, message: error.message || 'Не удалось сохранить изменения в базе цен.' };
  }
}
