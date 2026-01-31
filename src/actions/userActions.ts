// src/actions/userActions.ts
// @ts-nocheck
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp, query, where, getDocs, orderBy, runTransaction, setDoc, writeBatch, deleteDoc, increment, Timestamp } from '@/lib/mongoFirestoreServer';
import { randomBytes, createHash } from 'crypto';
import { getDb } from '@/lib/mongodb';
import { getMailer, getMailerFrom, isMailerConfigured } from '@/lib/mailer';
import type { HistoryRequest, AnalysisDetails, QuoteConfig, PriceBaseItem, SpecificationItem, ItemType } from '@/contexts/AppContext';
import { DEFAULT_SERVER_QUOTE_CONFIG } from '@/server-functions/config';
import { logProjectEvent, logUserAction } from '@/lib/logger';
import { AiSpecificationItemSchema, ExtractProjectSpecificationsOutputSchema } from '@/ai/genkit-schemas';


// --- Profile Management ---
const UpdateProfileSchema = z.object({
  userId: z.string().min(1, 'Необходимо указать ID пользователя.'),
  displayName: z.string().min(2, 'Никнейм должен содержать не менее 2 символов.').max(50, 'Никнейм не должен превышать 50 символов.'),
  telegramUsername: z.string().max(32, 'Имя пользователя Telegram не должно превышать 32 символов.').optional(),
  documentTemplates: z
    .object({
      proposal: z.string().optional(),
      invoice: z.string().optional(),
      contract: z.string().optional(),
    })
    .optional(),
  signatureUrl: z.string().optional().nullable(),
  signatureObjectKey: z.string().optional().nullable(),
  signatureUrlExpirationTimestamp: z.number().optional().nullable(),
  stampUrl: z.string().optional().nullable(),
  stampObjectKey: z.string().optional().nullable(),
  stampUrlExpirationTimestamp: z.number().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  avatarObjectKey: z.string().optional().nullable(),
  avatarUrlExpirationTimestamp: z.number().optional().nullable(),
});

export const updateUserProfile = async (data: z.infer<typeof UpdateProfileSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = UpdateProfileSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.flatten().fieldErrors;
    const errorMessage = Object.values(firstError)[0]?.[0] || 'Неверные данные.';
    return { success: false, message: errorMessage };
  }

  const {
    userId,
    displayName,
    telegramUsername,
    documentTemplates,
    signatureUrl,
    signatureObjectKey,
    signatureUrlExpirationTimestamp,
    stampUrl,
    stampObjectKey,
    stampUrlExpirationTimestamp,
    avatarUrl,
    avatarObjectKey,
    avatarUrlExpirationTimestamp,
  } = validation.data;
  const userRef = doc(db, 'users', userId);

  try {
    const updatePayload: Record<string, any> = {
      displayName,
      telegramUsername: telegramUsername || '', // Store empty string if not provided
      updatedAt: serverTimestamp(),
    };
    const updatedFields = ['displayName', 'telegramUsername'];

    if (documentTemplates !== undefined) {
      updatePayload.documentTemplates = documentTemplates;
      updatedFields.push('documentTemplates');
    }
    if (signatureUrl !== undefined) {
      updatePayload.signatureUrl = signatureUrl ?? null;
      updatedFields.push('signatureUrl');
    }
    if (signatureObjectKey !== undefined) {
      updatePayload.signatureObjectKey = signatureObjectKey ?? null;
      updatedFields.push('signatureObjectKey');
    }
    if (signatureUrlExpirationTimestamp !== undefined) {
      updatePayload.signatureUrlExpirationTimestamp = signatureUrlExpirationTimestamp ?? null;
      updatedFields.push('signatureUrlExpirationTimestamp');
    }
    if (stampUrl !== undefined) {
      updatePayload.stampUrl = stampUrl ?? null;
      updatedFields.push('stampUrl');
    }
    if (stampObjectKey !== undefined) {
      updatePayload.stampObjectKey = stampObjectKey ?? null;
      updatedFields.push('stampObjectKey');
    }
    if (stampUrlExpirationTimestamp !== undefined) {
      updatePayload.stampUrlExpirationTimestamp = stampUrlExpirationTimestamp ?? null;
      updatedFields.push('stampUrlExpirationTimestamp');
    }
    if (avatarUrl !== undefined) {
      updatePayload.avatarUrl = avatarUrl ?? null;
      updatedFields.push('avatarUrl');
    }
    if (avatarObjectKey !== undefined) {
      updatePayload.avatarObjectKey = avatarObjectKey ?? null;
      updatedFields.push('avatarObjectKey');
    }
    if (avatarUrlExpirationTimestamp !== undefined) {
      updatePayload.avatarUrlExpirationTimestamp = avatarUrlExpirationTimestamp ?? null;
      updatedFields.push('avatarUrlExpirationTimestamp');
    }

    await updateDoc(userRef, updatePayload);
    
    await logUserAction(userId, 'PROFILE_UPDATE', { fields: updatedFields });
    return { success: true, message: 'Профиль успешно обновлен.' };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, message: 'Ошибка при обновлении профиля.' };
  }
};

export const logThirdPartyConsent = async (userId: string, source: string = 'purchase_dialog'): Promise<{ success: boolean; message: string }> => {
  if (!userId) {
    return { success: false, message: 'Не указан пользователь.' };
  }

  try {
    await logUserAction(userId, 'USER_CONSENT_THIRD_PARTY', { source });
    return { success: true, message: 'Согласие зафиксировано.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Не удалось зафиксировать согласие.' };
  }
};

const UpdatePwaStatusSchema = z.object({
    userId: z.string().min(1),
    isPWA: z.boolean(),
});
export const updateUserPwaStatus = async (data: z.infer<typeof UpdatePwaStatusSchema>): Promise<{ success: boolean, message: string }> => {
    const validation = UpdatePwaStatusSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные.' };
    }
    const { userId, isPWA } = validation.data;
    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, { isPWAUser: isPWA, updatedAt: serverTimestamp() });
        return { success: true, message: 'Статус PWA обновлен.' };
    } catch (error) {
        console.error("Error updating PWA status:", error);
        return { success: false, message: 'Не удалось обновить статус PWA.' };
    }
};


const PasswordResetSchema = z.object({
    email: z.string().email('Неверный формат email.'),
});

export const sendPasswordReset = async (data: z.infer<typeof PasswordResetSchema>): Promise<{ success: boolean; message: string }> => {
    const validation = PasswordResetSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Пожалуйста, введите корректный email.' };
    }
    
    try {
        const mailerReady = await isMailerConfigured();
        if (!mailerReady) {
          return { success: false, message: 'Сброс пароля временно отключен администратором.' };
        }

        const dbClient = await getDb();
        const email = validation.data.email.toLowerCase();
        const user = await dbClient.collection('users').findOne({ email });
        if (!user) {
          return { success: false, message: 'Пользователь с таким email не найден.' };
        }

        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

        await dbClient.collection('password_resets').insertOne({
          userId: user._id,
          tokenHash,
          expiresAt,
          createdAt: new Date(),
        });

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const resetLink = `${siteUrl}/auth/reset?token=${token}`;
        const mailer = await getMailer();
        const from = await getMailerFrom();
        await mailer.sendMail({
          from,
          to: email,
          subject: 'Сброс пароля AI Сметчик',
          text: `Чтобы сбросить пароль, перейдите по ссылке: ${resetLink}`,
        });

        return { success: true, message: 'Письмо для сброса пароля отправлено! Проверьте вашу почту.' };
    } catch (error: any) {
        console.error("Password reset error:", error);
        return { success: false, message: 'Не удалось отправить письмо для сброса пароля.' };
    }
}


export const deductCredit = async (userId: string, amount: number): Promise<{success: boolean, message?: string}> => {
  const userRef = doc(db, 'users', userId);
  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("Пользователь не найден.");
      }
      const currentCredits = userDoc.data().credits || 0;
      if (currentCredits < amount) {
        throw new Error("Недостаточно кредитов.");
      }
      const newCredits = currentCredits - amount;
      transaction.update(userRef, { credits: newCredits });
    });
    return { success: true };
  } catch (error: any) {
    console.error("Credit deduction transaction failed:", error);
    return { success: false, message: error.message || 'Не удалось списать кредиты.' };
  }
};


const QuoteConfigSchema = z.object({
    taxType: z.enum(['none', 'vat_included', 'vat_added', 'usn']),
    includeCommissioning: z.boolean(),
    commissioningCost: z.number(),
    commissioningQuantity: z.number(),
    includeExecutiveDocumentation: z.boolean(),
    executiveDocumentationTotalCost: z.number(),
    executiveDocumentationQuantity: z.number(),
    includeMeasurementTrip: z.boolean(),
    measurementTripCost: z.number(),
    measurementTripQuantity: z.number(),
    includeDismantling: z.boolean(),
    dismantlingCost: z.number(),
    includeWallDrilling: z.boolean(),
    wallDrillingCount: z.number(),
    wallDrillingCost: z.number(),
    includeFloorDrilling: z.boolean(),
    floorDrillingCount: z.number(),
    floorDrillingCost: z.number(),
});

// This schema defines what the saveProjectVersion function accepts. Note it uses the full SpecificationItem.
const SaveVersionSchema = z.object({
  versionId: z.string().optional(),
  userId: z.string(),
  fileName: z.string(),
  fileUri: z.string().optional(),
  mimeType: z.string().optional(),
  cost: z.number(),
  modelUsed: z.string().optional(),
  
  outputSpecifications: z.array(z.any()),
  quoteConfig: QuoteConfigSchema.optional(),
  aiComment: z.string().nullable().optional(),
  analysisDetails: z.any().nullable().optional(),
  error: z.string().optional(),

  status: z.enum(['processing', 'success', 'failed', 'reported', 'draft', 'cancelled']),
  isMainVersion: z.boolean(),
  parentProjectId: z.string().nullable().optional(),
  importantExtractionNotes: z.array(z.string()).nullable().optional(),
  actionHistory: z.array(z.any()).optional(),
  version: z.number().optional(),
  aiCallCount: z.number().optional(),
  serverJobId: z.string().nullable().optional(),
  s3ObjectKey: z.string().nullable().optional(),
});


export const saveProjectVersion = async (data: z.infer<typeof SaveVersionSchema>): Promise<{ success: boolean; message: string; project: HistoryRequest | null; }> => {
    const validation = SaveVersionSchema.safeParse(data);
    if (!validation.success) {
        console.error("Version validation error:", validation.error.flatten());
        return { success: false, message: 'Неверные данные для сохранения.', project: null };
    }
    
    const { versionId, ...versionData } = validation.data;
    const batch = writeBatch(db);
    
    try {
        let docRef;
        let message = 'Проект успешно сохранен.';
        let action: 'PROJECT_DRAFT_CREATE' | 'PROJECT_DRAFT_UPDATE' | 'PROJECT_VERSION_PROMOTE' = 'PROJECT_DRAFT_CREATE';

        // --- Versioning Logic ---
        if (versionData.isMainVersion && versionData.parentProjectId) {
            action = 'PROJECT_VERSION_PROMOTE';
            // This means we are promoting a version to be the new main version.
            const projectGroupQuery = query(
                collection(db, 'requests'), 
                where('parentProjectId', '==', versionData.parentProjectId)
            );
            const querySnapshot = await getDocs(projectGroupQuery);
            querySnapshot.forEach(doc => {
                if (doc.data().isMainVersion) {
                    batch.update(doc.ref, { isMainVersion: false });
                }
            });
        }
        
        // --- Document Creation/Update ---
        const finalData = {
            ...versionData,
            aiComment: versionData.aiComment ?? '',
            analysisDetails: versionData.analysisDetails ?? null,
            importantExtractionNotes: versionData.importantExtractionNotes ?? [],
            actionHistory: versionData.actionHistory ?? [],
            timestamp: serverTimestamp(),
            updatedAt: serverTimestamp(),
            aiCallCount: versionData.aiCallCount ?? 0,
        };

        if (versionId) {
            docRef = doc(db, 'requests', versionId);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists() || docSnap.data().userId !== versionData.userId) {
                throw new Error("Проект не найден или у вас нет прав на его изменение.");
            }
            if (action !== 'PROJECT_VERSION_PROMOTE') {
                message = 'Изменения сохранены.';
                action = 'PROJECT_DRAFT_UPDATE';
            } else {
                 message = 'Новая версия сохранена как основная.';
            }
            batch.update(docRef, finalData as any);
        } else {
            docRef = doc(collection(db, 'requests'));
            message = 'Новая версия успешно сохранена.';
            action = 'PROJECT_DRAFT_CREATE';
            batch.set(docRef, { ...finalData, parentProjectId: finalData.parentProjectId || docRef.id } as any);
        }

        await batch.commit();

        await logUserAction(versionData.userId, action, { projectId: docRef.id, parentProjectId: versionData.parentProjectId });
        
        const finalProjectDoc = await getDoc(docRef);
        const savedProject = { id: finalProjectDoc.id, ...finalProjectDoc.data() } as HistoryRequest;

        return { success: true, message: message, project: savedProject };
    } catch (error) {
        console.error("Error saving version:", error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при сохранении.';
        return { success: false, message: errorMessage, project: null };
    }
};


// New function to handle final project creation and credit deduction atomically
export const finalizeProjectCreation = async (
  userId: string,
  projectData: Omit<HistoryRequest, 'id' | 'userId' | 'timestamp'>,
  creditCost: number,
  initialAiResponse?: any,
): Promise<{ success: boolean; message: string; project: HistoryRequest | null; }> => {
  const userRef = doc(db, 'users', userId);
  const projectRef = doc(collection(db, 'requests'));

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Get user document
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error('Пользователь не найден.');
      
      const currentCredits = userDoc.data().credits || 0;
      if (currentCredits < creditCost) throw new Error('Недостаточно кредитов для сохранения проекта.');

      // 2. Update user's credits and project count
      const newCredits = currentCredits - creditCost;
      transaction.update(userRef, { credits: newCredits, projectCount: increment(1) });

      // 3. Create the new project document
      const finalProjectData = {
        ...projectData,
        userId: userId,
        timestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cost: creditCost,
        status: 'success',
        isMainVersion: true, // New projects are always main versions
        version: 1, // It's the first version
        parentProjectId: projectRef.id, // It is its own parent
        actionHistory: [],
      };
      transaction.set(projectRef, finalProjectData);
      
      // 4. Create AI accuracy cache document
      if (projectData.fileSha1 && initialAiResponse) {
          const cacheRef = doc(db, 'file_analysis_cache', projectData.fileSha1);
          transaction.set(cacheRef, {
              originalAiResponse: initialAiResponse,
              createdAt: serverTimestamp(),
              reportCount: 0,
          }, { merge: true });
      }
    });

    await logUserAction(userId, 'PROJECT_DRAFT_CREATE', { projectId: projectRef.id, creditCost });
    
    const finalProjectDoc = await getDoc(projectRef);
    const savedProject = { id: finalProjectDoc.id, ...finalProjectDoc.data() } as HistoryRequest;

    return { success: true, message: 'Проект успешно создан и сохранен!', project: savedProject };

  } catch (error) {
    console.error("Error finalizing project creation:", error);
    const errorMessage = error instanceof Error ? error.message : 'Не удалось создать проект.';
    return { success: false, message: errorMessage, project: null };
  }
};


export const getUserHistory = async (userId: string): Promise<HistoryRequest[]> => {
    if (!userId) {
        throw new Error("Необходимо указать ID пользователя.");
    }

    const historyQuery = query(
        collection(db, 'requests'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(historyQuery);
    const historyList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as HistoryRequest[];
    
    return historyList;
};

const ReportRequestSchema = z.object({
  requestId: z.string().min(1),
  fileSha1: z.string().optional(),
  userId: z.string().min(1),
});

export const reportRequest = async (data: z.infer<typeof ReportRequestSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = ReportRequestSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверный ID запроса.' };
  }
  
  const { requestId, userId, fileSha1 } = validation.data;

  try {
    const requestRef = doc(db, 'requests', requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists() || requestDoc.data().userId !== userId) {
        return { success: false, message: 'Запрос не найден или у вас нет прав на это действие.' };
    }

    if (requestDoc.data().status === 'reported') {
        return { success: false, message: 'Жалоба по этому запросу уже была отправлена.' };
    }

    await updateDoc(requestRef, { 
        status: 'reported',
        reportedAt: serverTimestamp()
    });

    // Increment report count in cache if fileSha1 exists
    if (fileSha1) {
        const cacheRef = doc(db, 'file_analysis_cache', fileSha1);
        const cacheSnap = await getDoc(cacheRef);
        if (cacheSnap.exists()) {
             await updateDoc(cacheRef, { reportCount: increment(1) });
        }
    }
    
    await logUserAction(userId, 'PROJECT_REPORT', { projectId: requestId });
    return { success: true, message: 'Жалоба отправлена. Администратор рассмотрит ваш запрос.' };
  } catch (error) {
    console.error("Error reporting request:", error);
    return { success: false, message: 'Ошибка при отправке жалобы.' };
  }
};

const ReturnCreditSchema = z.object({
  userId: z.string().min(1),
  creditAmount: z.number().int().positive(),
});

export const returnCreditForFailedRequest = async (data: z.infer<typeof ReturnCreditSchema>): Promise<{ success: boolean, message: string }> => {
    const validation = ReturnCreditSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные для возврата кредита.' };
    }

    const { userId, creditAmount } = validation.data;
    
    const userRef = doc(db, 'users', userId);

    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) throw new Error('Пользователь не найден.');
        
        const currentCredits = userDoc.data().credits || 0;
        const newCredits = currentCredits + creditAmount;
        await updateDoc(userRef, { credits: newCredits });
        
        await logUserAction(userId, 'CREDIT_REFUND', {
            amount: creditAmount,
        });

        return { success: true, message: `Кредит в размере ${creditAmount} успешно возвращен.` };

    } catch (error) {
        console.error("Error returning credit:", error);
        const errorMessage = error instanceof Error ? error.message : 'Не удалось обработать запрос.';
        return { success: false, message: errorMessage };
    }
};


const ArchiveRequestSchema = z.object({
  requestIds: z.array(z.string().min(1)).min(1),
  userId: z.string().min(1),
});

export const archiveRequest = async (data: z.infer<typeof ArchiveRequestSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = ArchiveRequestSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверный ID запроса.' };
  }
  
  const { requestIds, userId } = validation.data;

  try {
    const batch = writeBatch(db);
    for (const id of requestIds) {
      const requestRef = doc(db, 'requests', id);
      batch.update(requestRef, { archivedAt: serverTimestamp() });
    }
    await batch.commit();
    
    await logUserAction(userId, 'PROJECT_ARCHIVE', { projectIds: requestIds });
    const message = requestIds.length > 1 ? 'Проекты успешно архивированы.' : 'Проект успешно архивирован.';
    return { success: true, message };
  } catch (error) {
    console.error("Error archiving request(s):", error);
    return { success: false, message: 'Ошибка при архивировании.' };
  }
};


export const unarchiveRequest = async (data: z.infer<typeof ArchiveRequestSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = ArchiveRequestSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверный ID запроса.' };
  }
  
  const { requestIds, userId } = validation.data;

  try {
    const batch = writeBatch(db);
    for (const id of requestIds) {
      const requestRef = doc(db, 'requests', id);
      batch.update(requestRef, { archivedAt: null });
    }
    await batch.commit();
    
    await logUserAction(userId, 'PROJECT_UNARCHIVE', { projectIds: requestIds });
    const message = requestIds.length > 1 ? 'Проекты успешно восстановлены.' : 'Проект успешно восстановлен.';
    return { success: true, message };
  } catch (error) {
    console.error("Error un-archiving request(s):", error);
    return { success: false, message: 'Ошибка при восстановлении.' };
  }
};

const DeleteRequestSchema = z.object({
  requestIds: z.array(z.string().min(1)).min(1),
  userId: z.string().min(1),
});

export const deleteRequest = async (data: z.infer<typeof DeleteRequestSchema>): Promise<{ success: boolean; message: string; }> => {
    const validation = DeleteRequestSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверный ID запроса.' };
    }
    const { requestIds, userId } = validation.data;

    try {
        const batch = writeBatch(db);
        for (const id of requestIds) {
            batch.delete(doc(db, 'requests', id));
        }
        await batch.commit();
        await logUserAction(userId, 'PROJECT_DELETE', { projectIds: requestIds });
        const message = requestIds.length > 1 ? 'Проекты успешно удалены.' : 'Проект успешно удален.';
        return { success: true, message };
    } catch (error) {
        console.error("Error deleting request(s):", error);
        return { success: false, message: 'Ошибка при удалении.' };
    }
}

const UpdateRequestSchema = z.object({
  requestIds: z.array(z.string().min(1)).min(1),
  userId: z.string().min(1),
  updates: z.object({
      objectId: z.string().nullable().optional(),
      objectName: z.string().nullable().optional(),
      fileName: z.string().optional(),
      actionHistory: z.array(z.any()).optional(),
  })
});

export const updateRequest = async (data: z.infer<typeof UpdateRequestSchema>): Promise<{ success: boolean; message: string }> => {
    const validation = UpdateRequestSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные для обновления.' };
    }
    const { requestIds, userId, updates } = validation.data;

    try {
        const batch = writeBatch(db);
        for(const id of requestIds) {
            const requestRef = doc(db, 'requests', id);
            batch.update(requestRef, { ...updates, updatedAt: serverTimestamp() });
        }
        await batch.commit();

        if (updates.objectId !== undefined) {
             if (updates.objectId === null) {
                await logUserAction(userId, 'PROJECT_UNGROUP_FROM_OBJECT', { projectIds: requestIds });
            } else {
                await logUserAction(userId, 'PROJECT_GROUP_INTO_OBJECT', { projectIds: requestIds, objectId: updates.objectId, objectName: updates.objectName });
            }
        }
        
        return { success: true, message: 'Проекты обновлены.' };
    } catch (error) {
        return { success: false, message: 'Ошибка при обновлении проектов.' };
    }
}


export const updatePriceBase = async (
    userId: string, 
    items: SpecificationItem[], 
    section: string
): Promise<{ success: boolean; message: string }> => {
    if (!userId) {
        return { success: false, message: "Необходимо указать ID пользователя." };
    }

    try {
        const batch = writeBatch(db);
        const priceBaseCol = collection(db, 'priceBaseItems');
        const q = query(priceBaseCol, where('userId', '==', userId));
        const existingPriceBaseSnap = await getDocs(q);
        const existingItems = new Map(existingPriceBaseSnap.docs.map(d => [d.data().key, d.id]));

        for (const specItem of items) {
            if (specItem.isInformational) continue;
            
            const itemKey = `${specItem.name}|${specItem.model || ''}|${specItem.brand || ''}|${specItem.unit}`.toLowerCase();
            
            const dataToSave: Omit<PriceBaseItem, 'id' | 'createdAt'> = {
                userId,
                key: itemKey,
                name: specItem.name,
                model: specItem.model || '',
                brand: specItem.brand || '',
                unit: specItem.unit,
                avgMaterialPrice: specItem.materialPrice || 0,
                avgInstallationPrice: specItem.installationPrice || 0,
                section,
                updatedAt: serverTimestamp(),
                itemType: specItem.itemType,
            };

            if (existingItems.has(itemKey)) {
                // Update existing item
                const docId = existingItems.get(itemKey)!;
                const docRef = doc(priceBaseCol, docId);
                batch.update(docRef, dataToSave as any);
            } else {
                // Create new item
                const newItemRef = doc(priceBaseCol);
                batch.set(newItemRef, { ...dataToSave, createdAt: serverTimestamp() });
                existingItems.set(itemKey, newItemRef.id);
            }
        }
        
        await batch.commit();
        await logUserAction(userId, 'PRICE_BASE_ITEM_UPDATE', { itemCount: items.length, section });
        return { success: true, message: `База цен успешно обновлена. Обработано ${items.length} позиций.` };

    } catch (error) {
        console.error("Error updating price base:", error);
        return { success: false, message: "Не удалось сохранить изменения в базе цен." };
    }
};


export const getUserPriceBase = async (userId: string): Promise<PriceBaseItem[]> => {
    if (!userId) throw new Error("Необходимо указать ID пользователя.");

    const q = query(collection(db, 'priceBaseItems'), where('userId', '==', userId), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as PriceBaseItem[];
};


const PriceBaseItemUpdateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  model: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().optional(),
  avgMaterialPrice: z.number().optional(),
  avgInstallationPrice: z.number().optional(),
  section: z.string().optional(),
});

export const savePriceBaseItems = async (
    userId: string, 
    items: Omit<PriceBaseItem, 'id' | 'createdAt' | 'key' | 'userId'>[]
): Promise<{ success: boolean; message: string; newIds?: string[] }> => {
    if (!userId) return { success: false, message: "Необходимо указать ID пользователя."};
    if (!items || items.length === 0) return { success: true, message: "Нет данных для сохранения."};

    try {
        const batch = writeBatch(db);
        const priceBaseCol = collection(db, 'priceBaseItems');
        const newIds: string[] = [];

        for (const item of items) {
             const newItemRef = doc(priceBaseCol);
             const key = `${item.name}|${item.model || ''}|${item.brand || ''}|${item.unit}`.toLowerCase();
             batch.set(newItemRef, { 
                ...item, 
                userId, 
                key, 
                createdAt: serverTimestamp() 
            });
            newIds.push(newItemRef.id);
        }
        
        await batch.commit();
        await logUserAction(userId, 'PRICE_BASE_IMPORT', { itemCount: items.length });
        return { success: true, message: `База цен успешно сохранена! Добавлено ${items.length} позиций.`, newIds };

    } catch (error) {
        console.error("Error saving price base:", error);
        return { success: false, message: "Не удалось сохранить изменения." };
    }
};

export const updatePriceBaseItem = async (userId: string, itemId: string, updates: Partial<PriceBaseItem>): Promise<{ success: boolean; message: string; }> => {
    if (!userId || !itemId) return { success: false, message: "Необходимо указать ID пользователя и ID позиции."};

    try {
        const docRef = doc(db, 'priceBaseItems', itemId);
        const docSnap = await getDoc(docRef);
        if(!docSnap.exists() || docSnap.data().userId !== userId) {
            return { success: false, message: "Позиция не найдена или у вас нет прав на ее изменение."}
        }
        
        const dataToUpdate: Partial<PriceBaseItem> & { updatedAt?: any } = { ...updates, updatedAt: serverTimestamp() };
        const originalItem = docSnap.data() as PriceBaseItem;

        const hasIdentifyingFieldChanged = 
            ('name' in dataToUpdate && dataToUpdate.name !== originalItem.name) ||
            ('model' in dataToUpdate && dataToUpdate.model !== originalItem.model) ||
            ('brand' in dataToUpdate && dataToUpdate.brand !== originalItem.brand) ||
            ('unit' in dataToUpdate && dataToUpdate.unit !== originalItem.unit);
        
        if(hasIdentifyingFieldChanged) {
             const newName = dataToUpdate.name ?? originalItem.name ?? '';
             const newModel = dataToUpdate.model ?? originalItem.model ?? '';
             const newBrand = dataToUpdate.brand ?? originalItem.brand ?? '';
             const newUnit = dataToUpdate.unit ?? originalItem.unit ?? '';
             dataToUpdate.key = `${newName}|${newModel}|${newBrand}|${newUnit}`.toLowerCase();
        }

        await updateDoc(docRef, dataToUpdate as any);
        await logUserAction(userId, 'PRICE_BASE_ITEM_UPDATE', { itemId: itemId, updatedFields: Object.keys(updates) });
        return { success: true, message: "Позиция обновлена." };

    } catch (error) {
        console.error("Error updating price base item:", error);
        return { success: false, message: "Не удалось сохранить изменения." };
    }
};

export const incrementAiCallCount = async (projectId: string): Promise<{ success: boolean; message?: string }> => {
    if (!projectId) return { success: false, message: "Project ID is required." };

    const projectRef = doc(db, 'requests', projectId);
    
    try {
        await updateDoc(projectRef, {
            aiCallCount: increment(1),
        });
        return { success: true };
    } catch (error) {
        console.error("Error incrementing AI call count:", error);
        return { success: false, message: "Could not update AI call count." };
    }
};

// --- Processing pipeline helpers (server/client parallel flow) ---

const CreateProcessingRequestSchema = z.object({
    userId: z.string().min(1),
    fileName: z.string().min(1),
    fileSha1: z.string().optional(),
    mimeType: z.string().optional(),
    modelUsed: z.string().optional(),
    fileUri: z.string().optional(),
    s3ObjectKey: z.string().optional(),
    serverJobId: z.string().optional(),
    objectId: z.string().nullable().optional(),
    objectName: z.string().nullable().optional(),
});

export const createProcessingRequest = async (data: z.infer<typeof CreateProcessingRequestSchema>): Promise<{ success: boolean; message: string; project?: HistoryRequest | null; }> => {
    const validation = CreateProcessingRequestSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные для создания черновика.', project: null };
    }

    const { userId, ...payload } = validation.data;
    const projectRef = doc(collection(db, 'requests'));

    try {
        const baseData: Omit<HistoryRequest, 'id' | 'timestamp'> = {
            userId,
            fileName: payload.fileName,
            fileUri: payload.fileUri || null,
            mimeType: payload.mimeType || null,
            fileSha1: payload.fileSha1,
            status: 'processing',
            cost: 0,
            modelUsed: payload.modelUsed,
            outputSpecifications: [],
            aiComment: '',
            importantExtractionNotes: [],
            analysisDetails: null,
            quoteConfig: DEFAULT_SERVER_QUOTE_CONFIG,
            isMainVersion: true,
            parentProjectId: projectRef.id,
            version: 1,
            aiCallCount: 0,
            objectId: payload.objectId ?? null,
            objectName: payload.objectName ?? null,
            actionHistory: [],
            serverJobId: payload.serverJobId || null,
            s3ObjectKey: payload.s3ObjectKey || null,
        };

        await setDoc(projectRef, {
            ...baseData,
            timestamp: serverTimestamp(),
            updatedAt: serverTimestamp(),
        } as any);

        await logProjectEvent({
            projectId: projectRef.id,
            userId,
            action: 'PROJECT_PROCESSING_START',
            stage: 'draft_created',
            status: 'info',
            source: 'server',
            model: payload.modelUsed,
            file: {
                name: payload.fileName,
                uri: payload.fileUri || null,
                sha1: payload.fileSha1,
                objectKey: payload.s3ObjectKey || null,
            },
            metadata: {
                serverJobId: payload.serverJobId || null,
            },
            message: 'Создан черновик запроса на обработку',
        });

        await logUserAction(userId, 'PROJECT_PROCESSING_START', { projectId: projectRef.id });
        const finalDoc = await getDoc(projectRef);
        return { success: true, message: 'Черновик создан.', project: { id: projectRef.id, ...finalDoc.data() } as HistoryRequest };
    } catch (error: any) {
        console.error("Error creating processing request:", error);
        await logProjectEvent({
            projectId: projectRef.id,
            userId,
            action: 'PROJECT_PROCESSING_FAILED',
            stage: 'draft_creation',
            status: 'error',
            source: 'server',
            model: payload?.modelUsed,
            file: {
                name: payload?.fileName,
                uri: payload?.fileUri || null,
                sha1: payload?.fileSha1,
                objectKey: payload?.s3ObjectKey || null,
            },
            metadata: {
                serverJobId: payload?.serverJobId || null,
            },
            message: error?.message || 'Не удалось создать черновик.',
            error,
        });
        return { success: false, message: error.message || 'Не удалось создать черновик.', project: null };
    }
};

const FinalizeProcessingRequestSchema = z.object({
    userId: z.string().min(1),
    projectId: z.string().min(1),
    creditCost: z.number().positive(),
    fileName: z.string(),
    fileUri: z.string(),
    mimeType: z.string(),
    fileSha1: z.string(),
    modelUsed: z.string(),
    outputSpecifications: z.array(z.any()),
    quoteConfig: QuoteConfigSchema.optional(),
    aiComment: z.string().nullable().optional(),
    analysisDetails: z.any().nullable().optional(),
    importantExtractionNotes: z.array(z.string()).nullable().optional(),
    aiCallCount: z.number().optional(),
    s3ObjectKey: z.string().nullable().optional(),
    initialAiResponse: z.any().optional(),
});

export const finalizeProcessingRequest = async (data: z.infer<typeof FinalizeProcessingRequestSchema>): Promise<{ success: boolean; message: string; project?: HistoryRequest | null; }> => {
    const validation = FinalizeProcessingRequestSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные для завершения проекта.' };
    }
    const {
        userId, projectId, creditCost, outputSpecifications, quoteConfig,
        aiComment, analysisDetails, importantExtractionNotes, aiCallCount,
        initialAiResponse, ...rest
    } = validation.data;

    const userRef = doc(db, 'users', userId);
    const projectRef = doc(db, 'requests', projectId);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error('Пользователь не найден.');
            const projectDoc = await transaction.get(projectRef);
            if (!projectDoc.exists()) throw new Error('Проект не найден.');
            const projectData = projectDoc.data() as HistoryRequest;
            if (projectData.userId !== userId) throw new Error('Нет доступа к проекту.');
            if (projectData.status === 'success') throw new Error('Проект уже завершен.');
            const currentCredits = userDoc.data().credits || 0;
            if (currentCredits < creditCost) throw new Error('Недостаточно кредитов.');

            transaction.update(userRef, { credits: currentCredits - creditCost, projectCount: increment(1) });

            transaction.update(projectRef, {
                ...rest,
                status: 'success',
                cost: creditCost,
                outputSpecifications,
                quoteConfig: quoteConfig || projectData.quoteConfig || DEFAULT_SERVER_QUOTE_CONFIG,
                aiComment: aiComment ?? '',
                analysisDetails: analysisDetails ?? null,
                importantExtractionNotes: importantExtractionNotes ?? [],
                aiCallCount: aiCallCount ?? 0,
                updatedAt: serverTimestamp(),
            } as any);

            if (rest.fileSha1 && initialAiResponse) {
                const cacheRef = doc(db, 'file_analysis_cache', rest.fileSha1);
                transaction.set(cacheRef, {
                    originalAiResponse: initialAiResponse,
                    createdAt: serverTimestamp(),
                    reportCount: 0,
                }, { merge: true });
            }
        });

        await logProjectEvent({
            projectId,
            userId,
            action: 'PROJECT_PROCESSING_COMPLETE',
            stage: 'finalize',
            status: 'success',
            source: 'server',
            model: rest.modelUsed,
            file: {
                name: rest.fileName,
                uri: rest.fileUri,
                sha1: rest.fileSha1,
                objectKey: rest.s3ObjectKey || null,
            },
            metadata: {
                creditCost,
                aiCallCount: aiCallCount ?? 0,
                outputSpecificationsCount: outputSpecifications?.length ?? 0,
                hasAnalysisDetails: !!analysisDetails,
                importantExtractionNotesCount: importantExtractionNotes?.length ?? 0,
            },
            response: initialAiResponse,
            message: 'Проект финализирован, списаны кредиты и сохранен результат.',
        });

        await logUserAction(userId, 'PROJECT_PROCESSING_COMPLETE', { projectId });
        const finalDoc = await getDoc(projectRef);
        return { success: true, message: 'Проект успешно завершен.', project: { id: finalDoc.id, ...finalDoc.data() } as HistoryRequest };
    } catch (error: any) {
        console.error("Error finalizing processing request:", error);
        await logProjectEvent({
            projectId,
            userId,
            action: 'PROJECT_PROCESSING_FAILED',
            stage: 'finalize',
            status: 'error',
            source: 'server',
            model: rest?.modelUsed,
            file: {
                name: rest?.fileName,
                uri: rest?.fileUri,
                sha1: rest?.fileSha1,
                objectKey: rest?.s3ObjectKey || null,
            },
            metadata: { creditCost, aiCallCount: aiCallCount ?? 0 },
            message: error?.message || 'Не удалось завершить проект.',
            error,
        });
        return { success: false, message: error.message || 'Не удалось завершить проект.', project: null };
    }
};

const FailProcessingRequestSchema = z.object({
    userId: z.string().min(1),
    projectId: z.string().min(1),
    status: z.enum(['failed', 'cancelled']),
    error: z.string().optional(),
});

export const failProcessingRequest = async (data: z.infer<typeof FailProcessingRequestSchema>): Promise<{ success: boolean; message: string; }> => {
    const validation = FailProcessingRequestSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные для обновления статуса.' };
    }
    const { userId, projectId, status, error } = validation.data;
    const projectRef = doc(db, 'requests', projectId);

    try {
        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists()) throw new Error('Проект не найден.');
        const projectData = projectSnap.data() as HistoryRequest;
        if (projectData.userId !== userId) throw new Error('Нет доступа к проекту.');

        await updateDoc(projectRef, {
            status,
            error: error || (status === 'cancelled' ? 'Процесс остановлен пользователем' : 'Ошибка анализа'),
            updatedAt: serverTimestamp(),
        } as any);

        await logUserAction(userId, status === 'cancelled' ? 'PROJECT_PROCESSING_CANCELLED' : 'PROJECT_PROCESSING_FAILED', { projectId });
        await logProjectEvent({
            projectId,
            userId,
            action: status === 'cancelled' ? 'PROJECT_PROCESSING_CANCELLED' : 'PROJECT_PROCESSING_FAILED',
            stage: 'status_update',
            status: status === 'cancelled' ? 'warning' : 'error',
            source: 'server',
            model: projectData.modelUsed,
            file: {
                name: projectData.fileName,
                uri: projectData.fileUri,
                sha1: projectData.fileSha1,
                objectKey: projectData.s3ObjectKey || null,
            },
            metadata: {
                serverJobId: projectData.serverJobId || null,
            },
            message: error || (status === 'cancelled' ? 'Процесс остановлен пользователем' : 'Ошибка анализа'),
        });
        return { success: true, message: 'Статус обновлен.' };
    } catch (err: any) {
        console.error("Error failing processing request:", err);
        await logProjectEvent({
            projectId,
            userId,
            action: 'PROJECT_PROCESSING_FAILED',
            stage: 'status_update',
            status: 'error',
            source: 'server',
            message: err?.message || 'Не удалось обновить проект.',
            error: err,
        });
        return { success: false, message: err.message || 'Не удалось обновить проект.' };
    }
};

export const linkRequestToServerJob = async (data: { userId: string; projectId: string; serverJobId: string }): Promise<{ success: boolean; message: string; }> => {
    const { userId, projectId, serverJobId } = data;
    if (!userId || !projectId || !serverJobId) return { success: false, message: 'Неверные данные.' };
    try {
        const projectRef = doc(db, 'requests', projectId);
        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists()) throw new Error('Проект не найден.');
        const projectData = projectSnap.data() as HistoryRequest;
        if (projectData.userId !== userId) throw new Error('Нет доступа к проекту.');
        await updateDoc(projectRef, { serverJobId, updatedAt: serverTimestamp() } as any);
        await logProjectEvent({
            projectId,
            userId,
            jobId: serverJobId,
            action: 'PROJECT_JOB_LINKED',
            stage: 'server_job_linked',
            status: 'info',
            source: 'server',
            model: projectData.modelUsed,
            file: {
                name: projectData.fileName,
                uri: projectData.fileUri,
                sha1: projectData.fileSha1,
                objectKey: projectData.s3ObjectKey || null,
            },
            metadata: {
                previousServerJobId: projectData.serverJobId || null,
            },
            message: 'Серверная задача связана с проектом',
        });
        return { success: true, message: 'Задача связана с проектом.' };
    } catch (err: any) {
        console.error("Error linking server job:", err);
        await logProjectEvent({
            projectId,
            userId,
            jobId: serverJobId,
            action: 'PROJECT_JOB_LINKED',
            stage: 'server_job_linked',
            status: 'error',
            source: 'server',
            message: err?.message || 'Не удалось связать задачу.',
            error: err,
        });
        return { success: false, message: err.message || 'Не удалось связать задачу.' };
    }
};

const RestartProcessingRequestSchema = z.object({
    userId: z.string().min(1),
    projectId: z.string().min(1),
    fileUri: z.string().optional(),
    s3ObjectKey: z.string().optional(),
});

export const restartProcessingRequest = async (data: z.infer<typeof RestartProcessingRequestSchema>): Promise<{ success: boolean; message: string; }> => {
    const validation = RestartProcessingRequestSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные для перезапуска.' };
    }
    const { userId, projectId, fileUri, s3ObjectKey } = validation.data;
    const projectRef = doc(db, 'requests', projectId);
    try {
        const snap = await getDoc(projectRef);
        if (!snap.exists()) throw new Error('Проект не найден.');
        const project = snap.data() as HistoryRequest;
        if (project.userId !== userId) throw new Error('Нет доступа к проекту.');

        await updateDoc(projectRef, {
            status: 'processing',
            error: '',
            cost: 0,
            fileUri: fileUri || project.fileUri || null,
            s3ObjectKey: s3ObjectKey || project.s3ObjectKey || null,
            serverJobId: null,
            updatedAt: serverTimestamp(),
        } as any);

        await logUserAction(userId, 'PROJECT_PROCESSING_RESTART', { projectId });
        await logProjectEvent({
            projectId,
            userId,
            action: 'PROJECT_PROCESSING_RESTART',
            stage: 'restart',
            status: 'info',
            source: 'server',
            model: project.modelUsed,
            file: {
                name: project.fileName,
                uri: fileUri || project.fileUri || null,
                sha1: project.fileSha1,
                objectKey: s3ObjectKey || project.s3ObjectKey || null,
            },
            metadata: {
                previousStatus: project.status,
                serverJobId: project.serverJobId || null,
            },
            message: 'Проект отправлен на повторную обработку',
        });
        return { success: true, message: 'Проект отправлен на повторную обработку.' };
    } catch (err: any) {
        console.error("Error restarting processing request:", err);
        await logProjectEvent({
            projectId,
            userId,
            action: 'PROJECT_PROCESSING_FAILED',
            stage: 'restart',
            status: 'error',
            source: 'server',
            message: err?.message || 'Не удалось перезапустить проект.',
            error: err,
        });
        return { success: false, message: err.message || 'Не удалось перезапустить проект.' };
    }
};
