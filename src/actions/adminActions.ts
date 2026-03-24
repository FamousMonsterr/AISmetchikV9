// src/actions/adminActions.ts
// @ts-nocheck
'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { collection, getDocs, doc, updateDoc, writeBatch, getDoc, serverTimestamp, query, where, orderBy, setDoc, deleteDoc, addDoc, limit, Timestamp } from '@/lib/db-server';
import { type AppUser, type SystemRole, type UserPlan, type HistoryRequest, type Company, type Notification, type Survey, SurveyResponse, BannerConfig } from '@/contexts/AppContext';
import { promises as fs } from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { LegalEntitySchema, type LegalEntity } from '@/ai/genkit-schemas';
import TelegramBot from '@/lib/telegram/telegraf-compat';
import { nanoid } from 'nanoid';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { S3Client, PutObjectCommand, GetObjectCommand, GetBucketCorsCommand, PutBucketCorsCommand, DeleteBucketCorsCommand, ListBucketsCommand, CreateBucketCommand, DeleteBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logUserAction, logAiApiCall, type ActionType } from '@/lib/logger';
import { grantCredits, refundCredits } from '@/services/credits';
import { startManagedBot, stopManagedBot, getBotRuntimeStatus, forceUnlockBot } from '@/server-functions/telegram/controller';
import { registerTelegramWebhook, clearTelegramWebhook, TELEGRAM_AUDIENCES, type TelegramAudience } from '@/server-functions/webhooks/telegram';
import { deleteVkCallbackServer, getVkCallbackStatus, pingVkApi, registerVkCallbackServer, sendVkMessage } from '@/server-functions/webhooks/vk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function isAdminRole(role?: string | null) {
    return role === 'Admin' || role === 'Super Admin';
}

async function ensureAdminActor(currentUserId?: string): Promise<string> {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id;
    const sessionRole = (session?.user as any)?.systemRole;

    if (sessionUserId) {
        if (!isAdminRole(sessionRole)) {
            throw new Error('Недостаточно прав.');
        }
        if (currentUserId && currentUserId !== sessionUserId) {
            throw new Error('Идентификатор администратора не совпадает с активной сессией.');
        }
        return sessionUserId;
    }

    if (!currentUserId) {
        throw new Error('Не удалось определить администратора запроса.');
    }
    const userDoc = await getDoc(doc(db, 'users', currentUserId));
    if (!isAdminRole(userDoc.data()?.systemRole)) {
        throw new Error('Недостаточно прав.');
    }
    return currentUserId;
}

// Helper to get Super Admin Email from settings first, then env
async function getSuperAdminEmail(): Promise<string | undefined> {
    const envSettings = await getEnvSettings({ allowInternal: true });
    return envSettings.superAdminEmail || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
}

export const getAllUsers = async (): Promise<AppUser[]> => {
    await ensureAdminActor();
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollection);
    const userList = userSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
    })) as AppUser[];
    return userList.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
};

const UpdateUserPermissionsSchema = z.object({
  currentUserId: z.string(), // Kept for logging purposes
  targetUid: z.string().min(1),
  updates: z.object({
      systemRole: z.enum(['User', 'Admin', 'Super Admin']).optional(),
      plan: z.enum(['Free', 'PRO', 'Business', 'Enterprise']).optional(),
      maxCompanies: z.number().int().min(0).optional(),
      maxActiveProjects: z.number().int().min(0).optional(),
      maxDraftsPerProject: z.number().int().min(0).optional(),
      availableModels: z.array(z.string()).optional(),
      canShareProjects: z.boolean().optional(),
      canUsePrivatePriceBase: z.boolean().optional(),
      canGroupProjects: z.boolean().optional(),
      planExpiresAt: z.date().nullable().optional(),
      originalPlan: z.enum(['Free', 'PRO', 'Business', 'Enterprise']).nullable().optional(),
      managerId: z.string().nullable().optional(),
      isTester: z.boolean().optional(),
      isDebugger: z.boolean().optional(),
      isPartner: z.boolean().optional(),
      isEditor: z.boolean().optional(),
      partnerStatus: z.enum(['Bronze', 'Silver', 'Gold', 'Platinum']).nullable().optional(),
  }),
});

export const updateUserPermissions = async (data: z.infer<typeof UpdateUserPermissionsSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = UpdateUserPermissionsSchema.safeParse(data);
  if (!validation.success) {
    console.error("Update validation error:", validation.error.flatten());
    return { success: false, message: 'Неверные данные.' };
  }

  const { currentUserId, targetUid, updates } = validation.data;
  let actorId = currentUserId;
  try {
    actorId = await ensureAdminActor(currentUserId);
  } catch (e: any) {
    return { success: false, message: e.message || 'Недостаточно прав.' };
  }
  
  const targetUserDoc = await getDoc(doc(db, 'users', targetUid));
  const targetUserData = targetUserDoc.data();
  
  const superAdminEmail = await getSuperAdminEmail();

  // Protect the designated Super Admin from being demoted by anyone.
  if (!!superAdminEmail && targetUserData?.email === superAdminEmail && updates.systemRole && updates.systemRole !== 'Super Admin') {
      return { success: false, message: 'Роль этого Супер-администратора защищена и не может быть изменена.' };
  }

  // Prevent Super Admin from demoting themselves, but allow other self-edits.
  if (actorId === targetUid && 'systemRole' in updates && updates.systemRole !== 'Super Admin') {
      return { success: false, message: 'Супер-администратор не может понизить собственную роль.' };
  }


  try {
    const userRef = doc(db, 'users', targetUid);
    
    const finalUpdates: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp() 
    };
    
    // Ensure nullable fields are correctly set or removed
    if ('managerId' in updates) {
        finalUpdates.managerId = updates.managerId;
    }
    if ('partnerStatus' in updates) {
        finalUpdates.partnerStatus = updates.partnerStatus;
    }

    // Remove undefined fields to avoid errors
    Object.keys(finalUpdates).forEach(key => finalUpdates[key] === undefined && delete finalUpdates[key]);

    await updateDoc(userRef, finalUpdates);

      await logUserAction(actorId, 'ADMIN_UPDATE_USER', {
      targetUserId: targetUid,
      updatedFields: Object.keys(updates),
    });

    return { success: true, message: `Данные пользователя обновлены.` };
  } catch (error) {
    console.error("Error updating user permissions:", error);
    return { success: false, message: 'Ошибка при обновлении прав пользователя.' };
  }
};

const AddCreditsSchema = z.object({
  currentUserId: z.string(), // Kept for logging
  targetUid: z.string().min(1),
  amount: z.number().int().positive(),
});

export const addCreditsToUser = async (data: z.infer<typeof AddCreditsSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = AddCreditsSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Неверные данные. Количество кредитов должно быть положительным числом.' };
  }

  const { currentUserId, targetUid, amount } = validation.data;
  let actorId = currentUserId;
  try {
    actorId = await ensureAdminActor(currentUserId);
  } catch (e: any) {
    return { success: false, message: e.message || 'Недостаточно прав.' };
  }
  
  try {
    const userRef = doc(db, 'users', targetUid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        return { success: false, message: 'Пользователь не найден.' };
    }

    const result = await grantCredits({
        userId: targetUid,
        amount,
        type: 'purchased',
        source: 'admin_add',
        metadata: { adminId: actorId },
    });

    await logUserAction(actorId, 'ADMIN_ADD_CREDITS', {
      targetUserId: targetUid,
      amountAdded: amount,
      newBalance: result.summary.total,
    });

    return { success: true, message: `${amount} кредитов успешно начислено.` };
  } catch (error) {
    console.error("Error adding credits:", error);
    return { success: false, message: 'Ошибка при начислении кредитов.' };
  }
};

const SetUserStatusSchema = z.object({
    currentUserId: z.string(), // Kept for logging
    targetUid: z.string().min(1),
    status: z.enum(['active', 'blocked']),
});

export const setUserStatus = async (data: z.infer<typeof SetUserStatusSchema>): Promise<{ success: boolean; message: string }> => {
    const validation = SetUserStatusSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные.' };
    }

    const { currentUserId, targetUid, status } = validation.data;
    let actorId = currentUserId;
    try {
        actorId = await ensureAdminActor(currentUserId);
    } catch (e: any) {
        return { success: false, message: e.message || 'Недостаточно прав.' };
    }

    const targetUserDoc = await getDoc(doc(db, 'users', targetUid));
    const targetUserData = targetUserDoc.data();
    const superAdminEmail = await getSuperAdminEmail();

    if (!!superAdminEmail && targetUserData?.email === superAdminEmail && status === 'blocked') {
        return { success: false, message: 'Этот Супер-администратор защищен и не может быть заблокирован.' };
    }

    if (actorId === targetUid) {
        return { success: false, message: 'Супер-администратор не может заблокировать сам себя.' };
    }

    try {
        const userRef = doc(db, 'users', targetUid);
        await updateDoc(userRef, { 
            status: status,
            updatedAt: serverTimestamp() 
        });

        await logUserAction(actorId, 'ADMIN_SET_USER_STATUS', {
          targetUserId: targetUid,
          newStatus: status,
        });

        const message = status === 'blocked' ? 'Пользователь заблокирован.' : 'Пользователь разблокирован.';
        return { success: true, message };
    } catch (error) {
        console.error("Error setting user status:", error);
        return { success: false, message: 'Ошибка при изменении статуса пользователя.' };
    }
};

const ArchiveUserSchema = z.object({
    currentUserId: z.string(), // Kept for logging
    targetUid: z.string().min(1),
});

export const archiveUser = async (data: z.infer<typeof ArchiveUserSchema>): Promise<{ success: boolean; message: string }> => {
    const validation = ArchiveUserSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные.' };
    }

    const { currentUserId, targetUid } = validation.data;
    let actorId = currentUserId;
    try {
        actorId = await ensureAdminActor(currentUserId);
    } catch (e: any) {
        return { success: false, message: e.message || 'Недостаточно прав.' };
    }

    const targetUserDoc = await getDoc(doc(db, 'users', targetUid));
    const targetUserData = targetUserDoc.data();
    const superAdminEmail = await getSuperAdminEmail();
    if (!!superAdminEmail && targetUserData?.email === superAdminEmail) {
        return { success: false, message: 'Этот Супер-администратор защищен и не может быть архивирован.' };
    }


    if (actorId === targetUid) {
        return { success: false, message: 'Супер-администратор не может архивировать сам себя.' };
    }
    
    try {
        const userRef = doc(db, 'users', targetUid);
        await updateDoc(userRef, { 
            archivedAt: serverTimestamp(),
            status: 'blocked'
        });
        
        await logUserAction(actorId, 'ADMIN_ARCHIVE_USER', {
            targetUserId: targetUid,
        });

        return { success: true, message: 'Пользователь архивирован.' };
    } catch (error) {
        console.error("Error archiving user:", error);
        return { success: false, message: 'Ошибка при архивировании пользователя.' };
    }
};

export const getReportedTickets = async (): Promise<HistoryRequest[]> => {
    const ticketsQuery = query(
        collection(db, 'requests'),
        where('status', '==', 'reported'),
        orderBy('reportedAt', 'desc')
    );
    try {
        const querySnapshot = await getDocs(ticketsQuery);
        const ticketList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as HistoryRequest[];
        return ticketList;
    } catch (error: any) {
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            throw new Error("Базе данных требуется время для создания индекса для тикетов. Пожалуйста, попробуйте снова через несколько минут.");
        }
        throw error;
    }
};

const ResolveTicketSchema = z.object({
  currentUserId: z.string(), // Kept for logging
  ticketId: z.string().min(1),
  userId: z.string().min(1),
  creditAmount: z.number().int().positive(),
});

export const returnCreditAndResolveTicket = async (data: z.infer<typeof ResolveTicketSchema>): Promise<{ success: boolean, message: string }> => {
    const validation = ResolveTicketSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные для обработки тикета.' };
    }

    const { ticketId, userId, creditAmount, currentUserId } = validation.data;
    let actorId = currentUserId;
    try {
        actorId = await ensureAdminActor(currentUserId);
    } catch (e: any) {
        return { success: false, message: e.message || 'Недостаточно прав.' };
    }
    
    const ticketRef = doc(db, 'requests', ticketId);

    try {
        const batch = writeBatch(db);

        await refundCredits({
            userId,
            amount: creditAmount,
            reason: 'ticket_refund',
            metadata: { ticketId, adminId: actorId },
        });

        batch.update(ticketRef, { 
            status: 'success', 
            resolvedAt: serverTimestamp(),
            resolvedBy: actorId,
        });
        
        await batch.commit();
        
        await logUserAction(actorId, 'ADMIN_RESOLVE_TICKET', {
            ticketId: ticketId,
            targetUserId: userId,
            creditAmount: creditAmount,
        });

        return { success: true, message: 'Кредит возвращен, тикет закрыт.' };

    } catch (error) {
        console.error("Error resolving ticket:", error);
        const errorMessage = error instanceof Error ? error.message : 'Не удалось обработать тикет.';
        return { success: false, message: errorMessage };
    }
};

export interface AppSettings {
    enterpriseEmail: string;
    serverFunctionsEnabled: boolean;
    serverFunctionsMode: 'client' | 'server';
    serverFunctionsPaidOnly: boolean;
    serverFunctionsAllowedPlans?: UserPlan[];
    analysisPipelineVersion: 'v1' | 'v2';
    aiExecutionProvider: 'openrouter' | 'local_hf';
    localHfEnabled: boolean;
    backendBaseUrl?: string;
    frontendBaseUrl?: string;
    allowedFrontendOrigins?: string[];
    jwtIssuer?: string;
    jwtAudience?: string;
}

const AppSettingsSchema = z.object({
    enterpriseEmail: z.string().email('Неверный формат email.').min(1, 'Email не может быть пустым.'),
    serverFunctionsEnabled: z.boolean().optional().default(false),
    serverFunctionsMode: z.enum(['client', 'server']).optional().default('client'),
    serverFunctionsPaidOnly: z.boolean().optional().default(true),
    serverFunctionsAllowedPlans: z.array(z.enum(['Free', 'PRO', 'Business', 'Enterprise'])).optional(),
    analysisPipelineVersion: z.enum(['v1', 'v2']).optional().default('v1'),
    aiExecutionProvider: z.enum(['openrouter', 'local_hf']).optional().default('openrouter'),
    localHfEnabled: z.boolean().optional().default(false),
    backendBaseUrl: z.string().url('Неверный URL backendBaseUrl.').optional().or(z.literal('')),
    frontendBaseUrl: z.string().url('Неверный URL frontendBaseUrl.').optional().or(z.literal('')),
    allowedFrontendOrigins: z.array(z.string().url('Неверный URL в allowedFrontendOrigins.')).optional(),
    jwtIssuer: z.string().optional().or(z.literal('')),
    jwtAudience: z.string().optional().or(z.literal('')),
});

export const getAppSettings = async (): Promise<AppSettings> => {
    try {
        const settingsRef = doc(db, 'configs', 'appSettings');
        const docSnap = await getDoc(settingsRef);

        const data = docSnap.exists() ? (docSnap.data() as Partial<AppSettings>) : {};
        return {
            enterpriseEmail: data.enterpriseEmail || '',
            serverFunctionsEnabled: data.serverFunctionsEnabled ?? false,
            serverFunctionsMode: data.serverFunctionsMode ?? 'client',
            serverFunctionsPaidOnly: data.serverFunctionsPaidOnly ?? true,
            serverFunctionsAllowedPlans: data.serverFunctionsAllowedPlans ?? ['PRO', 'Business', 'Enterprise'],
            analysisPipelineVersion: data.analysisPipelineVersion ?? 'v1',
            aiExecutionProvider: data.aiExecutionProvider ?? 'openrouter',
            localHfEnabled: data.localHfEnabled ?? false,
            backendBaseUrl: data.backendBaseUrl || '',
            frontendBaseUrl: data.frontendBaseUrl || '',
            allowedFrontendOrigins: data.allowedFrontendOrigins || [],
            jwtIssuer: data.jwtIssuer || '',
            jwtAudience: data.jwtAudience || '',
        };
    } catch (error) {
        console.error("Error getting app settings:", error);
        // Return default empty state on error
        return {
            enterpriseEmail: '',
            serverFunctionsEnabled: false,
            serverFunctionsMode: 'client',
            serverFunctionsPaidOnly: true,
            serverFunctionsAllowedPlans: ['PRO', 'Business', 'Enterprise'],
            analysisPipelineVersion: 'v1',
            aiExecutionProvider: 'openrouter',
            localHfEnabled: false,
            backendBaseUrl: '',
            frontendBaseUrl: '',
            allowedFrontendOrigins: [],
            jwtIssuer: '',
            jwtAudience: '',
        };
    }
};

export const updateAppSettings = async (currentUserId: string, data: AppSettings): Promise<{ success: boolean; message: string }> => {
    const validation = AppSettingsSchema.safeParse(data);
    if (!validation.success) {
        const flattened = validation.error.flatten().fieldErrors;
        const firstError = Object.values(flattened).flat()[0];
        return { success: false, message: firstError || 'Неверные данные.' };
    }
    
    let actorId = currentUserId;
    try {
        actorId = await ensureAdminActor(currentUserId);
        const settingsRef = doc(db, 'configs', 'appSettings');
        await setDoc(settingsRef, validation.data, { merge: true });

        await logUserAction(actorId, 'ADMIN_UPDATE_SETTINGS', {
            updatedSettings: validation.data,
        });

        return { success: true, message: 'Настройки успешно обновлены.' };
    } catch (error) {
        console.error("Error updating app settings:", error);
        return { success: false, message: 'Ошибка при обновлении настроек.' };
    }
};

export type Prompt = { id: string; name: string; description: string; promptText: string; allowedRoles: string[] };
const promptsFilePath = path.join(process.cwd(), 'src', 'lib', 'ai-constructor-config.json');

export const getPrompts = async (): Promise<Prompt[]> => {
    try {
        const fileContent = await fs.readFile(promptsFilePath, 'utf-8');
        const config = JSON.parse(fileContent);
        return config.prompts || [];
    } catch (error) {
        console.error("Error reading constructor config file:", error);
        throw new Error("Не удалось загрузить промпты.");
    }
};

export const updatePrompts = async (currentUserId: string, newPrompts: Prompt[]): Promise<{ success: boolean; message: string }> => {
    try {
        if (!Array.isArray(newPrompts)) {
            return { success: false, message: 'Неверный формат промптов.' };
        }
        
        const fileContent = await fs.readFile(promptsFilePath, 'utf-8');
        const config = JSON.parse(fileContent);
        
        const batch = writeBatch(db);

        for (const prompt of newPrompts) {
            const promptDocRef = doc(db, 'prompts', prompt.id);
            const currentPromptDoc = await getDoc(promptDocRef);

            let lastVersion = 0;
            let currentVersionText = '';
            
            if (currentPromptDoc.exists()) {
                lastVersion = currentPromptDoc.data().latestVersion || 0;
                const currentVersionRef = doc(promptDocRef, 'versions', String(lastVersion));
                const currentVersionSnap = await getDoc(currentVersionRef);
                if(currentVersionSnap.exists()) {
                    currentVersionText = currentVersionSnap.data().promptText;
                }
            }

            if (currentVersionText !== prompt.promptText) {
                const newVersionNumber = lastVersion + 1;
                const versionRef = doc(collection(promptDocRef, 'versions'), String(newVersionNumber));
                
                batch.set(versionRef, {
                    version: newVersionNumber,
                    promptText: prompt.promptText,
                    createdAt: serverTimestamp(),
                    authorId: currentUserId
                });
                batch.set(promptDocRef, { promptId: prompt.id, latestVersion: newVersionNumber }, { merge: true });
            }
        }
        
        await batch.commit();

        config.prompts = newPrompts;
        const jsonString = JSON.stringify(config, null, 4);
        await fs.writeFile(promptsFilePath, jsonString, 'utf-8');
        
        await logUserAction(currentUserId, 'ADMIN_UPDATE_PROMPTS', {
            updatedPromptCount: newPrompts.length,
        });

        return { success: true, message: 'Промпты успешно обновлены. Новые версии сохранены.' };
    } catch (error) {
        console.error("Error updating prompts:", error);
        return { success: false, message: 'Ошибка при сохранении промптов.' };
    }
};

// --- Trial Activation ---
const ActivateTrialSchema = z.object({
  userId: z.string().min(1),
  plan: z.enum(['PRO']),
});

export const activateTrial = async (data: z.infer<typeof ActivateTrialSchema>): Promise<{ success: boolean; message: string }> => {
    const validation = ActivateTrialSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные для активации триала.' };
    }

    const { userId, plan } = validation.data;
    try {
        await ensureAdminActor();
    } catch (e: any) {
        return { success: false, message: e.message || 'Недостаточно прав.' };
    }
    const userRef = doc(db, 'users', userId);

    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            return { success: false, message: 'Пользователь не найден.' };
        }
        const userData = userDoc.data() as AppUser;

        if (userData.hasUsedTrial) {
            return { success: false, message: 'Вы уже использовали пробный период.' };
        }

        const trialExpiresAt = new Date();
        trialExpiresAt.setDate(trialExpiresAt.getDate() + 3); // 3-day trial

        await updateDoc(userRef, {
            originalPlan: userData.plan, // Save the current plan
            plan: plan, // Temporarily upgrade plan
            planExpiresAt: trialExpiresAt, 
            hasUsedTrial: true,
            planSource: 'trial',
            updatedAt: serverTimestamp(),
        });
        
        await logUserAction(userId, 'TRIAL_ACTIVATED', {
            activatedPlan: plan,
        });

        return { success: true, message: `Пробный период для тарифа ${plan} успешно активирован на 3 дня!` };

    } catch (error: any) {
        console.error("Error activating trial:", error);
        return { success: false, message: 'Не удалось активировать пробный период.' };
    }
};

// --- Legal Entity Management ---
export const getLegalEntity = async (
    options?: { logErrors?: boolean }
): Promise<LegalEntity | null> => {
    const shouldLogErrors = options?.logErrors !== false;
    try {
        const docRef = doc(db, 'configs', 'legalEntity');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as LegalEntity;
        }
        return null; // Return null if not found
    } catch (error) {
        if (shouldLogErrors) {
            console.error("Error getting legal entity:", error);
        }
        return null; // Return null on error
    }
}

export const updateLegalEntity = async (currentUserId: string, data: LegalEntity): Promise<{ success: boolean; message: string }> => {
    const validation = LegalEntitySchema.safeParse(data);
    if (!validation.success) {
        const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, message: firstError || 'Неверные данные.' };
    }

    try {
        await setDoc(doc(db, 'configs', 'legalEntity'), data, { merge: true });
        await logUserAction(currentUserId, 'ADMIN_UPDATE_LEGAL_ENTITY', {});
        return { success: true, message: 'Юридические данные успешно обновлены.' };
    } catch (error) {
        console.error("Error updating legal entity:", error);
        return { success: false, message: 'Ошибка при обновлении юридических данных.' };
    }
};

// --- Telegram Admin Actions ---

export const getTelegramUsers = async (): Promise<AppUser[]> => {
    try {
        const session = await getServerSessionSafe();
        if (!session?.user?.id || !isAdminRole((session.user as any)?.systemRole)) {
            throw new Error('Недостаточно прав для просмотра Telegram-пользователей.');
        }
        const q = query(
            collection(db, 'users'),
            where('telegramChatId', '!=', null),
            orderBy('telegramChatId'), 
            orderBy('createdAt', 'desc') // Add secondary sort order
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as AppUser[];
        return users;
    } catch (error: any) {
        console.error("Error getting Telegram users:", error);
        // Provide a more helpful error message if the composite index is missing
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            throw new Error("Базе данных требуется время для создания индекса для пользователей Telegram. Пожалуйста, попробуйте снова через несколько минут.");
        }
        throw new Error("Не удалось получить список пользователей Telegram.");
    }
};

const SendTelegramMessageSchema = z.object({
  adminUserId: z.string(),
  targetUserId: z.string(),
  message: z.string().min(1, "Сообщение не может быть пустым."),
});

export const sendTelegramMessageToUser = async (data: z.infer<typeof SendTelegramMessageSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = SendTelegramMessageSchema.safeParse(data);
  if (!validation.success) {
    const error = validation.error.flatten().fieldErrors.message?.[0];
    return { success: false, message: error || 'Неверные данные.' };
  }

  const session = await getServerSessionSafe();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId || !isAdminRole((session.user as any)?.systemRole)) {
    return { success: false, message: 'Недостаточно прав для отправки сообщений.' };
  }
  if (validation.data.adminUserId && validation.data.adminUserId !== sessionUserId) {
    return { success: false, message: 'Идентификатор администратора не совпадает с активной сессией.' };
  }
  const actorId = sessionUserId;

  const envSettings = await getEnvSettings({ requesterId: actorId, requireAdmin: true });
  const botToken = envSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not configured.");
    return { success: false, message: "Сервер не настроен для работы с Telegram." };
  }

  const targetUserDoc = await getDoc(doc(db, 'users', validation.data.targetUserId));
  const targetUserChatId = targetUserDoc.data()?.telegramChatId;
  if (!targetUserChatId) {
    return { success: false, message: 'У пользователя не найден chat_id. Попросите привязать Telegram.' };
  }

  const { message } = validation.data;

  try {
    const bot = new TelegramBot(botToken);
    await bot.sendMessage(targetUserChatId, message);
    
    // Log the action without awaiting
    logUserAction(actorId, 'ADMIN_SEND_TELEGRAM_MESSAGE', {
        targetUserChatId,
    });

    return { success: true, message: "Сообщение успешно отправлено." };
  } catch (error: any) {
    console.error(`Telegram bot error sending message to ${targetUserChatId}:`, error.response?.body || error.message);
    const errorMessage = error.response?.body?.description || "Не удалось отправить сообщение. Возможно, пользователь заблокировал бота.";
    return { success: false, message: errorMessage };
  }
};


// --- Standard Sections Management ---

export interface StandardSection {
    id: string;
    section: string;
    hashtags: string[];
}

const sectionsFilePath = path.join(process.cwd(), 'src', 'lib', 'standard-sections.json');

export const getStandardSections = async (): Promise<StandardSection[]> => {
    try {
        const fileContent = await fs.readFile(sectionsFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Error reading standard sections file:", error);
        // If the file doesn't exist, return an empty array
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }
        throw new Error("Не удалось загрузить стандартные разделы.");
    }
};

export const updateStandardSections = async (currentUserId: string, newSections: StandardSection[]): Promise<{ success: boolean; message: string }> => {
    try {
        if (!Array.isArray(newSections)) {
            return { success: false, message: 'Неверный формат данных.' };
        }
        const jsonString = JSON.stringify(newSections, null, 4);
        await fs.writeFile(sectionsFilePath, jsonString, 'utf-8');

        await logUserAction(currentUserId, 'ADMIN_UPDATE_SECTIONS', {
            sectionCount: newSections.length,
        });

        return { success: true, message: 'Стандартные разделы успешно обновлены.' };
    } catch (error) {
        console.error("Error writing sections file:", error);
        return { success: false, message: 'Ошибка при сохранении стандартных разделов.' };
    }
};

// --- AI Agent Config Management ---
export interface AiPlanModelConfig {
  defaultModel?: string;
  abTestModels?: string[];
  availableModels?: string[];
}

export interface AiAgentConfig {
  providers: Record<string, { name: string; baseUrl: string; pdfProcessingPriority?: ('native' | 'mistral-ocr' | 'pdf-text')[] }>;
  apiModels: any[];
  planModels?: {
    free?: AiPlanModelConfig;
    pro?: AiPlanModelConfig;
    business?: AiPlanModelConfig;
    enterprise?: AiPlanModelConfig;
  };
}


const aiConfigFilePath = path.join(process.cwd(), 'src', 'lib', 'ai-config.json');

export const getAiAgentConfig = async (): Promise<AiAgentConfig> => {
    try {
        const fileContent = await fs.readFile(aiConfigFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Error reading AI config file:", error);
        throw new Error("Не удалось загрузить конфигурацию AI.");
    }
};

export const updateAiAgentConfig = async (currentUserId: string, newConfig: AiAgentConfig): Promise<{ success: boolean; message: string }> => {
    try {
        const jsonString = JSON.stringify(newConfig, null, 4);
        await fs.writeFile(aiConfigFilePath, jsonString, 'utf-8');
        await logUserAction(currentUserId, 'ADMIN_UPDATE_AI_CONFIG', {});
        return { success: true, message: 'Конфигурация AI успешно обновлена.' };
    } catch (error) {
        console.error("Error writing AI config file:", error);
        return { success: false, message: 'Ошибка при сохранении конфигурации AI.' };
    }
};


// --- Bug Reporting ---
export const getRecentLogs = async (userId: string, count: number = 10) => {
    const logsQuery = query(
        collection(db, 'user_logs'), 
        where('userId', '==', userId), 
        orderBy('timestamp', 'desc'), 
        limit(count)
    );
    const snapshot = await getDocs(logsQuery);
    return snapshot.docs.map(doc => doc.data());
};

const BugReportSchema = z.object({
  userId: z.string(),
  errorMessage: z.string(),
  errorDetails: z.string(),
  fileUri: z.string().url().optional(),
  recentLogs: z.array(z.any()).optional(),
  htmlSnapshot: z.string().optional(),
});

export const reportUserBug = async (data: z.infer<typeof BugReportSchema>) => {
    const validation = BugReportSchema.safeParse(data);
    if (!validation.success) {
      console.error("Invalid bug report data:", validation.error);
      return { success: false, message: 'Неверные данные для отчета об ошибке.' };
    }

    try {
      await addDoc(collection(db, 'bug_reports'), {
        ...validation.data,
        createdAt: serverTimestamp(),
        status: 'new', // Initial status
      });
      return { success: true, message: 'Отчет об ошибке успешно отправлен.' };
    } catch (error) {
      console.error("Failed to submit bug report:", error);
      return { success: false, message: 'Не удалось отправить отчет об ошибке.' };
    }
};

// --- ENV VARS Management ---
export interface EnvSettings {
    superAdminEmail?: string;
    telegramBotToken?: string;
    nextPublicTelegramBotUrl?: string;
    nextPublicTelegramBotUsername?: string;
    telegramAuthEmailDomain?: string;
    telegramBotEnabled?: boolean;
    telegramBotMode?: 'polling' | 'webhook';
    telegramBotWebhookUrl?: string;
    telegramBotSecretToken?: string;
    telegramBotTokenUser?: string;
    telegramBotSecretTokenUser?: string;
    telegramBotWebhookUrlUser?: string;
    telegramBotEnabledUser?: boolean;
    telegramBotTokenPartner?: string;
    telegramBotSecretTokenPartner?: string;
    telegramBotWebhookUrlPartner?: string;
    telegramBotEnabledPartner?: boolean;
    telegramBotTokenManager?: string;
    telegramBotSecretTokenManager?: string;
    telegramBotWebhookUrlManager?: string;
    telegramBotEnabledManager?: boolean;
    telegramBotTokenAdmin?: string;
    telegramBotSecretTokenAdmin?: string;
    telegramBotWebhookUrlAdmin?: string;
    telegramBotEnabledAdmin?: boolean;
    vkAuthEmailDomain?: string;
    vkIdClientId?: string;
    vkIdClientSecret?: string;
    vkIdRedirectUri?: string;
    vkBotEnabled?: boolean;
    vkGroupId?: string;
    vkAccessToken?: string;
    vkCallbackSecret?: string;
    vkConfirmationToken?: string;
    vkWebhookUrl?: string;
    qaTestUserEmail?: string;
    qaTestUserPassword?: string;
    qaTestUserPhone?: string;
    qaProtectUser?: boolean;
    dadataApiKey?: string;
    dadataApiSecret?: string;
    ozonBankApiBaseUrl?: string;
    ozonBankApiToken?: string;
    ozonBankSyncPath?: string;
    openRouterApiKey?: string;
    localHfBaseUrl?: string;
    localHfModelId?: string;
    localHfApiKey?: string;
    defaultFallbackModel?: string;
    passkeyOrigin?: string;
    passkeyRpId?: string;
    passkeyRpName?: string;
    passkeyTimeoutMs?: number;
    passkeyChallengeTtlMs?: number;
    passkeyUserVerification?: 'required' | 'preferred' | 'discouraged';
    passkeyAttestation?: 'none' | 'direct' | 'indirect' | 'enterprise';
    mongoUri?: string;
    mongoDbName?: string;
    mongoLogsUri?: string;
    mongoLogsDbName?: string;
    smtpEnabled?: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
    // S3 settings
    s3StorageEnabled?: boolean;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    s3Endpoint?: string;
    s3Region?: string;
    s3BucketName?: string;
    s3TenantId?: string; // For cloud.ru
    s3BucketIsPublic?: boolean;
    s3PresignedUrlExpiration?: number;
    s3PersonalBucketName?: string;
    s3PersonalBucketIsPublic?: boolean;
    s3AvatarBucketName?: string;
    s3AvatarBucketIsPublic?: boolean;
    s3AvatarPresetId?: string;
    s3AvatarSecondaryBucketName?: string;
    s3AvatarSecondaryPresetId?: string;
    s3UserDocsBucketName?: string;
    s3UserDocsBucketIsPublic?: boolean;
    s3UserDocsPresetId?: string;
    s3UserDocsSecondaryBucketName?: string;
    s3UserDocsSecondaryPresetId?: string;
    s3ProjectDocsBucketName?: string;
    s3ProjectDocsBucketIsPublic?: boolean;
    s3ProjectDocsPresetId?: string;
    s3ProjectDocsSecondaryBucketName?: string;
    s3ProjectDocsSecondaryPresetId?: string;
    s3AnalysisSecondaryBucketName?: string;
    s3AnalysisSecondaryPresetId?: string;
    s3Presets?: Array<{
        id: string;
        name: string;
        provider?: string;
        config: {
            s3AccessKeyId?: string;
            s3SecretAccessKey?: string;
            s3Endpoint?: string;
            s3Region?: string;
            s3BucketName?: string;
            s3TenantId?: string;
            s3BucketIsPublic?: boolean;
            s3PresignedUrlExpiration?: number;
        };
    }>;
    s3ActivePresetId?: string;
    s3SecondaryEnabled?: boolean;
    s3SecondaryPresetId?: string;
    // Server functions (mirrors AppSettings for toggles)
    serverFunctionsEnabled?: boolean;
    serverFunctionsMode?: 'client' | 'server';
    serverFunctionsPaidOnly?: boolean;
    serverFunctionsAllowedPlans?: UserPlan[];
}

const EnvSettingsSchema = z.object({
    superAdminEmail: z.string().email('Неверный формат email.').optional().or(z.literal('')),
    telegramBotToken: z.string().optional().or(z.literal('')),
    nextPublicTelegramBotUrl: z.string().url('Неверный URL.').optional().or(z.literal('')),
    nextPublicTelegramBotUsername: z.string().optional().or(z.literal('')),
    telegramAuthEmailDomain: z.string().optional().or(z.literal('')),
    telegramBotEnabled: z.boolean().optional(),
    telegramBotMode: z.enum(['polling', 'webhook']).optional(),
    telegramBotWebhookUrl: z.string().url('Неверный URL вебхука.').optional().or(z.literal('')),
    telegramBotSecretToken: z.string().optional().or(z.literal('')),
    telegramBotTokenUser: z.string().optional().or(z.literal('')),
    telegramBotSecretTokenUser: z.string().optional().or(z.literal('')),
    telegramBotWebhookUrlUser: z.string().url('Неверный URL вебхука (user).').optional().or(z.literal('')),
    telegramBotEnabledUser: z.boolean().optional(),
    telegramBotTokenPartner: z.string().optional().or(z.literal('')),
    telegramBotSecretTokenPartner: z.string().optional().or(z.literal('')),
    telegramBotWebhookUrlPartner: z.string().url('Неверный URL вебхука (partner).').optional().or(z.literal('')),
    telegramBotEnabledPartner: z.boolean().optional(),
    telegramBotTokenManager: z.string().optional().or(z.literal('')),
    telegramBotSecretTokenManager: z.string().optional().or(z.literal('')),
    telegramBotWebhookUrlManager: z.string().url('Неверный URL вебхука (manager).').optional().or(z.literal('')),
    telegramBotEnabledManager: z.boolean().optional(),
    telegramBotTokenAdmin: z.string().optional().or(z.literal('')),
    telegramBotSecretTokenAdmin: z.string().optional().or(z.literal('')),
    telegramBotWebhookUrlAdmin: z.string().url('Неверный URL вебхука (admin).').optional().or(z.literal('')),
    telegramBotEnabledAdmin: z.boolean().optional(),
    vkAuthEmailDomain: z.string().optional().or(z.literal('')),
    vkIdClientId: z.string().optional().or(z.literal('')),
    vkIdClientSecret: z.string().optional().or(z.literal('')),
    vkIdRedirectUri: z.string().url('Неверный VK redirect URL.').optional().or(z.literal('')),
    vkBotEnabled: z.boolean().optional(),
    vkGroupId: z.string().optional().or(z.literal('')),
    vkAccessToken: z.string().optional().or(z.literal('')),
    vkCallbackSecret: z.string().optional().or(z.literal('')),
    vkConfirmationToken: z.string().optional().or(z.literal('')),
    vkWebhookUrl: z.string().url('Неверный VK webhook URL.').optional().or(z.literal('')),
    qaTestUserEmail: z.string().email('Неверный email QA пользователя.').optional().or(z.literal('')),
    qaTestUserPassword: z.string().optional().or(z.literal('')),
    qaTestUserPhone: z.string().optional().or(z.literal('')),
    qaProtectUser: z.boolean().optional(),
    dadataApiKey: z.string().optional().or(z.literal('')),
    dadataApiSecret: z.string().optional().or(z.literal('')),
    ozonBankApiBaseUrl: z.string().optional().or(z.literal('')),
    ozonBankApiToken: z.string().optional().or(z.literal('')),
    ozonBankSyncPath: z.string().optional().or(z.literal('')),
    openRouterApiKey: z.string().optional().or(z.literal('')),
    localHfBaseUrl: z.string().url('Неверный URL для локальной HF модели.').optional().or(z.literal('')),
    localHfModelId: z.string().optional().or(z.literal('')),
    localHfApiKey: z.string().optional().or(z.literal('')),
    defaultFallbackModel: z.string().optional().or(z.literal('')),
    passkeyOrigin: z.string().url('Неверный PASSKEY_ORIGIN.').optional().or(z.literal('')),
    passkeyRpId: z.string().optional().or(z.literal('')),
    passkeyRpName: z.string().optional().or(z.literal('')),
    passkeyTimeoutMs: z.number().int().min(1000).optional(),
    passkeyChallengeTtlMs: z.number().int().min(1000).optional(),
    passkeyUserVerification: z.enum(['required', 'preferred', 'discouraged']).optional(),
    passkeyAttestation: z.enum(['none', 'direct', 'indirect', 'enterprise']).optional(),
    mongoUri: z.string().url('Неверный URL MongoDB.').optional().or(z.literal('')),
    mongoDbName: z.string().optional().or(z.literal('')),
    mongoLogsUri: z.string().url('Неверный URL MongoDB для логов.').optional().or(z.literal('')),
    mongoLogsDbName: z.string().optional().or(z.literal('')),
    smtpEnabled: z.boolean().optional(),
    smtpHost: z.string().optional().or(z.literal('')),
    smtpPort: z.number().int().min(1).optional(),
    smtpSecure: z.boolean().optional(),
    smtpUser: z.string().optional().or(z.literal('')),
    smtpPass: z.string().optional().or(z.literal('')),
    smtpFrom: z.string().optional().or(z.literal('')),
    // S3 validation
    s3StorageEnabled: z.boolean().optional(),
    s3AccessKeyId: z.string().optional().or(z.literal('')),
    s3SecretAccessKey: z.string().optional().or(z.literal('')),
    s3Endpoint: z.string().url('Неверный URL.').optional().or(z.literal('')),
    s3Region: z.string().optional().or(z.literal('')),
    s3BucketName: z.string().optional().or(z.literal('')),
    s3TenantId: z.string().optional().or(z.literal('')),
    s3BucketIsPublic: z.boolean().optional(),
    s3PresignedUrlExpiration: z.number().int().min(1).optional(),
    s3PersonalBucketName: z.string().optional().or(z.literal('')),
    s3PersonalBucketIsPublic: z.boolean().optional(),
    s3AvatarBucketName: z.string().optional().or(z.literal('')),
    s3AvatarBucketIsPublic: z.boolean().optional(),
    s3AvatarPresetId: z.string().optional().or(z.literal('')),
    s3AvatarSecondaryBucketName: z.string().optional().or(z.literal('')),
    s3AvatarSecondaryPresetId: z.string().optional().or(z.literal('')),
    s3UserDocsBucketName: z.string().optional().or(z.literal('')),
    s3UserDocsBucketIsPublic: z.boolean().optional(),
    s3UserDocsPresetId: z.string().optional().or(z.literal('')),
    s3UserDocsSecondaryBucketName: z.string().optional().or(z.literal('')),
    s3UserDocsSecondaryPresetId: z.string().optional().or(z.literal('')),
    s3ProjectDocsBucketName: z.string().optional().or(z.literal('')),
    s3ProjectDocsBucketIsPublic: z.boolean().optional(),
    s3ProjectDocsPresetId: z.string().optional().or(z.literal('')),
    s3ProjectDocsSecondaryBucketName: z.string().optional().or(z.literal('')),
    s3ProjectDocsSecondaryPresetId: z.string().optional().or(z.literal('')),
    s3AnalysisSecondaryBucketName: z.string().optional().or(z.literal('')),
    s3AnalysisSecondaryPresetId: z.string().optional().or(z.literal('')),
    s3Presets: z.array(z.any()).optional(),
    s3ActivePresetId: z.string().optional().or(z.literal('')),
    s3SecondaryEnabled: z.boolean().optional(),
    s3SecondaryPresetId: z.string().optional().or(z.literal('')),
    serverFunctionsEnabled: z.boolean().optional(),
    serverFunctionsMode: z.enum(['client', 'server']).optional(),
    serverFunctionsPaidOnly: z.boolean().optional(),
    serverFunctionsAllowedPlans: z.array(z.enum(['Free', 'PRO', 'Business', 'Enterprise'])).optional(),
});

type GetEnvOptions = {
    requesterId?: string; // used for permission checks when called from client
    requireAdmin?: boolean; // throw if requester is not Admin/Super Admin
    allowInternal?: boolean; // internal server calls that should bypass stripping
    stripSecrets?: boolean; // force stripping secrets regardless of role
};

const SECRET_FIELDS: Array<keyof EnvSettings> = [
    'telegramBotToken',
    'telegramBotSecretToken',
    'telegramBotTokenUser',
    'telegramBotSecretTokenUser',
    'telegramBotTokenPartner',
    'telegramBotSecretTokenPartner',
    'telegramBotTokenManager',
    'telegramBotSecretTokenManager',
    'telegramBotTokenAdmin',
    'telegramBotSecretTokenAdmin',
    'vkIdClientSecret',
    'vkAccessToken',
    'vkCallbackSecret',
    'vkConfirmationToken',
    'qaTestUserPassword',
    'dadataApiKey',
    'dadataApiSecret',
    'ozonBankApiToken',
    'openRouterApiKey',
    'localHfApiKey',
    'mongoUri',
    'mongoDbName',
    'mongoLogsUri',
    'mongoLogsDbName',
    'smtpUser',
    'smtpPass',
    's3AccessKeyId',
    's3SecretAccessKey',
    's3Endpoint',
    's3Region',
    's3BucketName',
    's3TenantId',
    's3PersonalBucketName',
    's3AvatarBucketName',
    's3AvatarPresetId',
    's3AvatarSecondaryBucketName',
    's3AvatarSecondaryPresetId',
    's3UserDocsBucketName',
    's3UserDocsPresetId',
    's3UserDocsSecondaryBucketName',
    's3UserDocsSecondaryPresetId',
    's3ProjectDocsBucketName',
    's3ProjectDocsPresetId',
    's3ProjectDocsSecondaryBucketName',
    's3ProjectDocsSecondaryPresetId',
    's3AnalysisSecondaryBucketName',
    's3AnalysisSecondaryPresetId',
    's3Presets',
    's3ActivePresetId',
    's3SecondaryPresetId',
];

const sanitizeEnvSettings = (settings: EnvSettings): EnvSettings => {
    const clone: EnvSettings = { ...settings };
    SECRET_FIELDS.forEach((field) => {
        if (field in clone) {
            delete (clone as any)[field];
        }
    });
    return clone;
};

const ENV_FILE_MAP: Record<string, (settings: EnvSettings) => string | undefined> = {
    MONGODB_URI: (s) => s.mongoUri,
    MONGODB_DB: (s) => s.mongoDbName,
    MONGODB_LOGS_URI: (s) => s.mongoLogsUri,
    MONGODB_LOGS_DB: (s) => s.mongoLogsDbName,
    SUPER_ADMIN_EMAIL: (s) => s.superAdminEmail,
    TELEGRAM_BOT_TOKEN: (s) => s.telegramBotToken,
    TELEGRAM_AUTH_EMAIL_DOMAIN: (s) => s.telegramAuthEmailDomain,
    TELEGRAM_BOT_SECRET_TOKEN: (s) => s.telegramBotSecretToken,
    TELEGRAM_BOT_WEBHOOK_URL: (s) => s.telegramBotWebhookUrl,
    TELEGRAM_BOT_TOKEN_USER: (s) => s.telegramBotTokenUser,
    TELEGRAM_BOT_SECRET_TOKEN_USER: (s) => s.telegramBotSecretTokenUser,
    TELEGRAM_BOT_WEBHOOK_URL_USER: (s) => s.telegramBotWebhookUrlUser,
    TELEGRAM_BOT_TOKEN_PARTNER: (s) => s.telegramBotTokenPartner,
    TELEGRAM_BOT_SECRET_TOKEN_PARTNER: (s) => s.telegramBotSecretTokenPartner,
    TELEGRAM_BOT_WEBHOOK_URL_PARTNER: (s) => s.telegramBotWebhookUrlPartner,
    TELEGRAM_BOT_TOKEN_MANAGER: (s) => s.telegramBotTokenManager,
    TELEGRAM_BOT_SECRET_TOKEN_MANAGER: (s) => s.telegramBotSecretTokenManager,
    TELEGRAM_BOT_WEBHOOK_URL_MANAGER: (s) => s.telegramBotWebhookUrlManager,
    TELEGRAM_BOT_TOKEN_ADMIN: (s) => s.telegramBotTokenAdmin,
    TELEGRAM_BOT_SECRET_TOKEN_ADMIN: (s) => s.telegramBotSecretTokenAdmin,
    TELEGRAM_BOT_WEBHOOK_URL_ADMIN: (s) => s.telegramBotWebhookUrlAdmin,
    QA_TEST_USER_EMAIL: (s) => s.qaTestUserEmail,
    QA_TEST_USER_PASSWORD: (s) => s.qaTestUserPassword,
    QA_TEST_USER_PHONE: (s) => s.qaTestUserPhone,
    QA_PROTECT_USER: (s) => s.qaProtectUser !== undefined ? String(!!s.qaProtectUser) : undefined,
    NEXT_PUBLIC_TELEGRAM_BOT_URL: (s) => s.nextPublicTelegramBotUrl,
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: (s) => s.nextPublicTelegramBotUsername,
    VK_AUTH_EMAIL_DOMAIN: (s) => s.vkAuthEmailDomain,
    VK_ID_CLIENT_ID: (s) => s.vkIdClientId,
    VK_ID_CLIENT_SECRET: (s) => s.vkIdClientSecret,
    VK_ID_REDIRECT_URI: (s) => s.vkIdRedirectUri,
    VK_BOT_ENABLED: (s) => s.vkBotEnabled !== undefined ? String(!!s.vkBotEnabled) : undefined,
    VK_GROUP_ID: (s) => s.vkGroupId,
    VK_ACCESS_TOKEN: (s) => s.vkAccessToken,
    VK_CALLBACK_SECRET: (s) => s.vkCallbackSecret,
    VK_CONFIRMATION_TOKEN: (s) => s.vkConfirmationToken,
    VK_WEBHOOK_URL: (s) => s.vkWebhookUrl,
    DADATA_API_KEY: (s) => s.dadataApiKey,
    DADATA_API_SECRET: (s) => s.dadataApiSecret,
    OZON_BANK_API_BASE_URL: (s) => s.ozonBankApiBaseUrl,
    OZON_BANK_API_TOKEN: (s) => s.ozonBankApiToken,
    OZON_BANK_SYNC_PATH: (s) => s.ozonBankSyncPath,
    OPENROUTER_API_KEY: (s) => s.openRouterApiKey,
    LOCAL_HF_BASE_URL: (s) => s.localHfBaseUrl,
    LOCAL_HF_MODEL_ID: (s) => s.localHfModelId,
    LOCAL_HF_API_KEY: (s) => s.localHfApiKey,
    DEFAULT_FALLBACK_MODEL: (s) => s.defaultFallbackModel,
    PASSKEY_ORIGIN: (s) => s.passkeyOrigin,
    PASSKEY_RP_ID: (s) => s.passkeyRpId,
    PASSKEY_RP_NAME: (s) => s.passkeyRpName,
    PASSKEY_TIMEOUT_MS: (s) => s.passkeyTimeoutMs !== undefined ? String(s.passkeyTimeoutMs) : undefined,
    PASSKEY_CHALLENGE_TTL_MS: (s) => s.passkeyChallengeTtlMs !== undefined ? String(s.passkeyChallengeTtlMs) : undefined,
    PASSKEY_USER_VERIFICATION: (s) => s.passkeyUserVerification,
    PASSKEY_ATTESTATION: (s) => s.passkeyAttestation,
    SMTP_ENABLED: (s) => s.smtpEnabled !== undefined ? String(!!s.smtpEnabled) : undefined,
    SMTP_HOST: (s) => s.smtpHost,
    SMTP_PORT: (s) => s.smtpPort !== undefined ? String(s.smtpPort) : undefined,
    SMTP_SECURE: (s) => s.smtpSecure !== undefined ? String(!!s.smtpSecure) : undefined,
    SMTP_USER: (s) => s.smtpUser,
    SMTP_PASS: (s) => s.smtpPass,
    SMTP_FROM: (s) => s.smtpFrom,
    S3_STORAGE_ENABLED: (s) => s.s3StorageEnabled !== undefined ? String(!!s.s3StorageEnabled) : undefined,
    S3_ACCESS_KEY_ID: (s) => s.s3AccessKeyId,
    S3_SECRET_ACCESS_KEY: (s) => s.s3SecretAccessKey,
    S3_ENDPOINT: (s) => s.s3Endpoint,
    S3_REGION: (s) => s.s3Region,
    S3_BUCKET_NAME: (s) => s.s3BucketName,
    S3_TENANT_ID: (s) => s.s3TenantId,
    S3_BUCKET_IS_PUBLIC: (s) => s.s3BucketIsPublic !== undefined ? String(!!s.s3BucketIsPublic) : undefined,
    S3_PRESIGNED_URL_EXPIRATION: (s) => s.s3PresignedUrlExpiration !== undefined ? String(s.s3PresignedUrlExpiration) : undefined,
    S3_PERSONAL_BUCKET_NAME: (s) => s.s3PersonalBucketName,
    S3_PERSONAL_BUCKET_IS_PUBLIC: (s) => s.s3PersonalBucketIsPublic !== undefined ? String(!!s.s3PersonalBucketIsPublic) : undefined,
    S3_AVATAR_BUCKET_NAME: (s) => s.s3AvatarBucketName,
    S3_AVATAR_BUCKET_IS_PUBLIC: (s) => s.s3AvatarBucketIsPublic !== undefined ? String(!!s.s3AvatarBucketIsPublic) : undefined,
    S3_AVATAR_PRESET_ID: (s) => s.s3AvatarPresetId,
    S3_AVATAR_SECONDARY_BUCKET_NAME: (s) => s.s3AvatarSecondaryBucketName,
    S3_AVATAR_SECONDARY_PRESET_ID: (s) => s.s3AvatarSecondaryPresetId,
    S3_USER_DOCS_BUCKET_NAME: (s) => s.s3UserDocsBucketName,
    S3_USER_DOCS_BUCKET_IS_PUBLIC: (s) => s.s3UserDocsBucketIsPublic !== undefined ? String(!!s.s3UserDocsBucketIsPublic) : undefined,
    S3_USER_DOCS_PRESET_ID: (s) => s.s3UserDocsPresetId,
    S3_USER_DOCS_SECONDARY_BUCKET_NAME: (s) => s.s3UserDocsSecondaryBucketName,
    S3_USER_DOCS_SECONDARY_PRESET_ID: (s) => s.s3UserDocsSecondaryPresetId,
    S3_PROJECT_DOCS_BUCKET_NAME: (s) => s.s3ProjectDocsBucketName,
    S3_PROJECT_DOCS_BUCKET_IS_PUBLIC: (s) => s.s3ProjectDocsBucketIsPublic !== undefined ? String(!!s.s3ProjectDocsBucketIsPublic) : undefined,
    S3_PROJECT_DOCS_PRESET_ID: (s) => s.s3ProjectDocsPresetId,
    S3_PROJECT_DOCS_SECONDARY_BUCKET_NAME: (s) => s.s3ProjectDocsSecondaryBucketName,
    S3_PROJECT_DOCS_SECONDARY_PRESET_ID: (s) => s.s3ProjectDocsSecondaryPresetId,
    S3_ANALYSIS_SECONDARY_BUCKET_NAME: (s) => s.s3AnalysisSecondaryBucketName,
    S3_ANALYSIS_SECONDARY_PRESET_ID: (s) => s.s3AnalysisSecondaryPresetId,
};

const envLine = (key: string, value: string) => `${key}="${value.replace(/"/g, '\\"')}"`;

async function persistEnvFile(settings: EnvSettings) {
    try {
        const envPath = path.join(process.cwd(), '.env');
        let existingContent = '';
        try {
            existingContent = await fs.readFile(envPath, 'utf-8');
        } catch {
            existingContent = '';
        }
        const existingMap: Record<string, string> = {};
        existingContent.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
            const [k, ...rest] = trimmed.split('=');
            const v = rest.join('=').replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
            existingMap[k.trim()] = v;
        });

        Object.entries(ENV_FILE_MAP).forEach(([key, getter]) => {
            const val = getter(settings);
            if (val !== undefined) {
                existingMap[key] = val ?? '';
            }
        });

        const finalLines = Object.entries(existingMap).map(([k, v]) => envLine(k, v ?? ''));
        await fs.writeFile(envPath, finalLines.join('\n'), 'utf-8');
    } catch (err) {
        console.error('Failed to persist .env file from admin settings:', err);
    }
}

export type ConnectivityStatus = {
    mongo: { ok: boolean; message: string; uriSource: 'env' | 'panel' | 'none' };
    mongoLogs: { ok: boolean; message: string; uriSource: 'env' | 'panel' | 'inherit-main' | 'none' };
    s3: { ok: boolean; message: string };
    telegram: { ok: boolean; message: string };
    vk: { ok: boolean; message: string };
    openrouter: { ok: boolean; message: string };
};

export const getEnvSettings = async (options: GetEnvOptions = {}): Promise<EnvSettings> => {
    const { requesterId, requireAdmin, allowInternal, stripSecrets } = options;

    try {
        const settingsRef = doc(db, 'configs', 'envSettings');
        const docSnap = await getDoc(settingsRef);
        const data = docSnap.exists() ? (docSnap.data() as EnvSettings) : {};

        let requesterIsAdmin = false;
        if (requesterId) {
            const userDoc = await getDoc(doc(db, 'users', requesterId));
            requesterIsAdmin = isAdminRole(userDoc.data()?.systemRole);
        }

        if (requireAdmin && !requesterIsAdmin) {
            throw new Error('Недостаточно прав для просмотра переменных окружения.');
        }

        const canSeeSecrets = allowInternal || requesterIsAdmin;
        if (stripSecrets || !canSeeSecrets) {
            return sanitizeEnvSettings(data);
        }

        return data;
    } catch (error) {
        console.error("Error getting env settings:", error);
        if (requireAdmin) {
            throw error;
        }
        return {};
    }
};

export const getPublicEnvSettings = async (): Promise<EnvSettings> => {
    const settings = await getEnvSettings({ stripSecrets: true });
    return settings;
};

export async function testConnectivity(options: { requesterId?: string; requireAdmin?: boolean } = {}): Promise<{ success: boolean; status: ConnectivityStatus; message?: string }> {
    const { requesterId, requireAdmin } = options;
    if (requireAdmin) {
        await ensureAdminActor(requesterId);
    }

    const env = await getEnvSettings({ allowInternal: true });
    const mongoUri = process.env.MONGODB_URI || env.mongoUri;
    const mongoDbName = process.env.MONGODB_DB || env.mongoDbName;
    const mongoLogsUri = process.env.MONGODB_LOGS_URI || env.mongoLogsUri || mongoUri;
    const mongoLogsDbName = process.env.MONGODB_LOGS_DB || env.mongoLogsDbName || mongoDbName;

    const status: ConnectivityStatus = {
        mongo: { ok: false, message: '', uriSource: mongoUri ? (process.env.MONGODB_URI ? 'env' : 'panel') : 'none' },
        mongoLogs: {
            ok: false,
            message: '',
            uriSource: process.env.MONGODB_LOGS_URI
              ? 'env'
              : env.mongoLogsUri
                ? 'panel'
                : (mongoUri ? 'inherit-main' : 'none'),
        },
        s3: { ok: false, message: 'Не проверено' },
        telegram: {
            ok: !!(
                env.telegramBotToken ||
                env.telegramBotTokenUser ||
                env.telegramBotTokenPartner ||
                env.telegramBotTokenManager ||
                env.telegramBotTokenAdmin ||
                process.env.TELEGRAM_BOT_TOKEN ||
                process.env.TELEGRAM_BOT_TOKEN_USER ||
                process.env.TELEGRAM_BOT_TOKEN_PARTNER ||
                process.env.TELEGRAM_BOT_TOKEN_MANAGER ||
                process.env.TELEGRAM_BOT_TOKEN_ADMIN
            ),
            message: (
                env.telegramBotToken ||
                env.telegramBotTokenUser ||
                env.telegramBotTokenPartner ||
                env.telegramBotTokenManager ||
                env.telegramBotTokenAdmin ||
                process.env.TELEGRAM_BOT_TOKEN ||
                process.env.TELEGRAM_BOT_TOKEN_USER ||
                process.env.TELEGRAM_BOT_TOKEN_PARTNER ||
                process.env.TELEGRAM_BOT_TOKEN_MANAGER ||
                process.env.TELEGRAM_BOT_TOKEN_ADMIN
            ) ? 'Токен найден (default или audience).' : 'Токен отсутствует',
        },
        vk: {
            ok: !!(
                env.vkIdClientId ||
                env.vkIdClientSecret ||
                env.vkAccessToken ||
                process.env.VK_ID_CLIENT_ID ||
                process.env.VK_ID_CLIENT_SECRET ||
                process.env.VK_ACCESS_TOKEN
            ),
            message: (
                env.vkIdClientId ||
                env.vkIdClientSecret ||
                env.vkAccessToken ||
                process.env.VK_ID_CLIENT_ID ||
                process.env.VK_ID_CLIENT_SECRET ||
                process.env.VK_ACCESS_TOKEN
            ) ? 'VK env найден.' : 'VK env отсутствует',
        },
        openrouter: { ok: !!(env.openRouterApiKey || process.env.OPENROUTER_API_KEY), message: (env.openRouterApiKey || process.env.OPENROUTER_API_KEY) ? 'Ключ найден' : 'Ключ отсутствует' },
    };

    // Mongo check
    if (!mongoUri || !mongoDbName) {
        status.mongo.ok = false;
        status.mongo.message = 'MONGODB_URI или MONGODB_DB не заданы (env или панель).';
    } else {
        try {
            const client = await new MongoClient(mongoUri).connect();
            await client.db(mongoDbName).command({ ping: 1 });
            await client.close();
            status.mongo.ok = true;
            status.mongo.message = 'Подключение успешно.';
        } catch (err: any) {
            status.mongo.ok = false;
            status.mongo.message = err.message || 'Ошибка подключения.';
        }
    }

    if (!mongoLogsUri || !mongoLogsDbName) {
        status.mongoLogs.ok = false;
        status.mongoLogs.message = 'MONGODB_LOGS_URI или MONGODB_LOGS_DB не заданы.';
    } else {
        try {
            const client = await new MongoClient(mongoLogsUri).connect();
            await client.db(mongoLogsDbName).command({ ping: 1 });
            await client.close();
            status.mongoLogs.ok = true;
            status.mongoLogs.message = mongoLogsUri === mongoUri && mongoLogsDbName === mongoDbName
              ? 'Используется та же база, что и основная.'
              : 'Подключение к log DB успешно.';
        } catch (err: any) {
            status.mongoLogs.ok = false;
            status.mongoLogs.message = err.message || 'Ошибка подключения к log DB.';
        }
    }

    // S3 check
    try {
        const s3Result = await testS3Connection();
        status.s3.ok = s3Result.success;
        status.s3.message = s3Result.message;
    } catch (err: any) {
        status.s3.ok = false;
        status.s3.message = err?.message || 'Ошибка проверки S3.';
    }

    return { success: true, status };
}

export const updateEnvSettings = async (currentUserId: string, data: EnvSettings): Promise<{ success: boolean; message: string }> => {
    const validation = EnvSettingsSchema.safeParse(data);
    if (!validation.success) {
        // Find the first error message to display
        const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, message: firstError || 'Неверные данные.' };
    }
    
    let actorId = currentUserId;
    try {
        actorId = await ensureAdminActor(currentUserId);
        const settingsRef = doc(db, 'configs', 'envSettings');
        await setDoc(settingsRef, validation.data, { merge: true });
        await logUserAction(actorId, 'ADMIN_UPDATE_ENV_SETTINGS', {});
        await persistEnvFile(validation.data);
        return { success: true, message: 'Переменные окружения успешно обновлены. Изменения могут примениться не сразу.' };
    } catch (error) {
        console.error("Error updating env settings:", error);
        return { success: false, message: 'Ошибка при обновлении переменных.' };
    }
};

export const getOzonBankSyncStatus = async (adminUserId: string) => {
    const envSettings = await getEnvSettings({ requesterId: adminUserId, requireAdmin: true });
    if (!envSettings) {
        return { success: false, message: 'Недостаточно прав.' };
    }
    const docRef = doc(db, 'configs', 'ozonBankSync');
    const docSnap = await getDoc(docRef);
    return { success: true, data: docSnap.exists() ? docSnap.data() : null };
};

export const syncOzonBank = async (adminUserId: string) => {
    const envSettings = await getEnvSettings({ requesterId: adminUserId, requireAdmin: true });
    if (!envSettings) {
        return { success: false, message: 'Недостаточно прав.' };
    }
    const baseUrl = envSettings.ozonBankApiBaseUrl;
    const token = envSettings.ozonBankApiToken;
    const syncPath = envSettings.ozonBankSyncPath || '/transactions';

    if (!baseUrl || !token) {
        return { success: false, message: 'Ozon Bank API не настроен.' };
    }

    try {
        const url = new URL(syncPath, baseUrl).toString();
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        const payloadText = await response.text();
        const status = response.ok ? 'success' : 'error';
        const message = response.ok ? 'Синхронизация выполнена.' : `Ошибка синхронизации: ${response.status}`;

        await setDoc(
            doc(db, 'configs', 'ozonBankSync'),
            {
                lastSyncAt: serverTimestamp(),
                lastSyncStatus: status,
                lastSyncMessage: message,
                lastSyncPayload: payloadText?.slice(0, 2000) || null,
            },
            { merge: true },
        );

        return { success: response.ok, message };
    } catch (error: any) {
        console.error('Ozon Bank sync failed:', error);
        await setDoc(
            doc(db, 'configs', 'ozonBankSync'),
            {
                lastSyncAt: serverTimestamp(),
                lastSyncStatus: 'error',
                lastSyncMessage: error.message || 'Ошибка синхронизации.',
            },
            { merge: true },
        );
        return { success: false, message: error.message || 'Ошибка синхронизации.' };
    }
};

// --- Telegram Bot lifecycle (admin) ---
export const startTelegramBotService = async (adminUserId: string): Promise<{ success: boolean; message: string; status?: any }> => {
    try {
        await ensureAdminActor(adminUserId);
    } catch {
        return { success: false, message: 'Недостаточно прав.' };
    }
    try {
        const status = await startManagedBot();
        const lockInstance = status?.lock?.instanceId;
        const localInstance = status?.instanceId;
        if (status?.lockFresh && lockInstance && lockInstance !== localInstance) {
            return { success: true, message: `Бот уже запущен в другом экземпляре: ${lockInstance}`, status };
        }
        return { success: true, message: 'Бот запущен (polling). Для webhook настройте HTTPS и перезапустите.', status };
    } catch (e: any) {
        return { success: false, message: e?.message || 'Не удалось запустить бот.' };
    }
};

export const stopTelegramBotService = async (adminUserId: string): Promise<{ success: boolean; message: string; status?: any }> => {
    try {
        await ensureAdminActor(adminUserId);
    } catch {
        return { success: false, message: 'Недостаточно прав.' };
    }
    const status = await stopManagedBot();
    return { success: true, message: 'Бот остановлен.', status };
};

export const getTelegramBotStatus = async (adminUserId: string): Promise<{ success: boolean; status?: any; message?: string }> => {
    try {
        await ensureAdminActor(adminUserId);
    } catch {
        return { success: false, message: 'Недостаточно прав.' };
    }
    const status = await getBotRuntimeStatus();
    return { success: true, status };
};

export const forceUnlockTelegramBotService = async (adminUserId: string): Promise<{ success: boolean; message: string; status?: any }> => {
    try {
        await ensureAdminActor(adminUserId);
    } catch {
        return { success: false, message: 'Недостаточно прав.' };
    }
    const status = await forceUnlockBot();
    return { success: true, message: 'Lock сброшен.', status };
};

export const testTelegramMongoConnection = async (adminUserId: string): Promise<{ success: boolean; message: string }> => {
    try {
        await ensureAdminActor(adminUserId);
    } catch {
        return { success: false, message: 'Недостаточно прав.' };
    }
    try {
        const mongo = await getDb();
        await mongo.command({ ping: 1 });
        return { success: true, message: 'MongoDB доступен.' };
    } catch (e: any) {
        return { success: false, message: e?.message || 'MongoDB недоступен.' };
    }
};

export const testTelegramApiConnection = async (
    adminUserId: string,
    audience: TelegramAudience = 'default'
): Promise<{ success: boolean; message: string }> => {
    let actorId: string;
    try {
        actorId = await ensureAdminActor(adminUserId);
    } catch {
        return { success: false, message: 'Недостаточно прав.' };
    }
    const envSettings = await getEnvSettings({ requesterId: actorId, requireAdmin: true });
    const config = resolveTelegramAudienceConfig(envSettings, audience);
    const botToken = config.token;
    if (!botToken) {
        return { success: false, message: `Токен не задан для аудитории ${audience}.` };
    }
    try {
        const bot = new TelegramBot(botToken, { polling: false });
        const me = await bot.getMe();
        return { success: true, message: `Telegram OK (${audience}): @${me.username || me.id}` };
    } catch (e: any) {
        return { success: false, message: e?.response?.body?.description || e?.message || 'Ошибка Telegram API.' };
    }
};

export const testTelegramWebhookInfo = async (
    adminUserId: string,
    audience: TelegramAudience = 'default'
): Promise<{ success: boolean; message: string }> => {
    let actorId: string;
    try {
        actorId = await ensureAdminActor(adminUserId);
    } catch {
        return { success: false, message: 'Недостаточно прав.' };
    }
    const envSettings = await getEnvSettings({ requesterId: actorId, requireAdmin: true });
    const config = resolveTelegramAudienceConfig(envSettings, audience);
    const botToken = config.token;
    if (!botToken) {
        return { success: false, message: `Токен не задан для аудитории ${audience}.` };
    }
    try {
        const bot = new TelegramBot(botToken, { polling: false });
        const info = await bot.getWebhookInfo();
        return { success: true, message: info?.url ? `Webhook (${audience}): ${info.url}` : `Webhook (${audience}) не настроен.` };
    } catch (e: any) {
        return { success: false, message: e?.response?.body?.description || e?.message || 'Ошибка webhook info.' };
    }
};

export const registerTelegramWebhookService = async (adminUserId: string): Promise<{ success: boolean; message: string }> => {
    try {
        await ensureAdminActor(adminUserId);
    } catch {
        return { success: false, message: 'Недостаточно прав.' };
    }
    try {
        const result = await registerTelegramWebhook();
        return { success: true, message: `Webhook зарегистрирован: ${result.webhookUrl}` };
    } catch (e: any) {
        return { success: false, message: e?.message || 'Не удалось зарегистрировать webhook.' };
    }
};

const TelegramAudienceSchema = z.enum(TELEGRAM_AUDIENCES as unknown as [TelegramAudience, ...TelegramAudience[]]);

const TELEGRAM_AUDIENCE_SUFFIX: Record<TelegramAudience, string> = {
    default: '',
    user: 'User',
    partner: 'Partner',
    manager: 'Manager',
    admin: 'Admin',
};

const resolveTelegramAudienceConfig = (envSettings: EnvSettings, audience: TelegramAudience) => {
    const suffix = TELEGRAM_AUDIENCE_SUFFIX[audience];
    const envSuffix = audience.toUpperCase();

    const token = (envSettings as any)[`telegramBotToken${suffix}`]
        || process.env[`TELEGRAM_BOT_TOKEN_${envSuffix}`]
        || envSettings.telegramBotToken
        || process.env.TELEGRAM_BOT_TOKEN;

    const secretToken = (envSettings as any)[`telegramBotSecretToken${suffix}`]
        || process.env[`TELEGRAM_BOT_SECRET_TOKEN_${envSuffix}`]
        || envSettings.telegramBotSecretToken
        || process.env.TELEGRAM_BOT_SECRET_TOKEN
        || '';

    const webhookUrl = (envSettings as any)[`telegramBotWebhookUrl${suffix}`]
        || process.env[`TELEGRAM_BOT_WEBHOOK_URL_${envSuffix}`]
        || envSettings.telegramBotWebhookUrl
        || process.env.TELEGRAM_BOT_WEBHOOK_URL
        || '';

    const enabledScoped = (envSettings as any)[`telegramBotEnabled${suffix}`];
    const enabled = enabledScoped == null
        ? envSettings.telegramBotEnabled !== false
        : enabledScoped !== false;

    return {
        audience,
        token,
        secretToken,
        webhookUrl,
        enabled,
    };
};

export const getTelegramAudienceStatus = async (
    adminUserId: string,
    audience: TelegramAudience
): Promise<{ success: boolean; message: string; status?: any }> => {
    const actorId = await ensureAdminActor(adminUserId);
    const parsed = TelegramAudienceSchema.safeParse(audience);
    if (!parsed.success) {
        return { success: false, message: 'Неизвестная аудитория webhook.' };
    }
    const envSettings = await getEnvSettings({ requesterId: actorId, requireAdmin: true });
    const config = resolveTelegramAudienceConfig(envSettings, parsed.data);

    let webhookInfo: any = null;
    if (config.token) {
        try {
            const bot = new TelegramBot(config.token, { polling: false });
            webhookInfo = await bot.getWebhookInfo();
        } catch {
            webhookInfo = null;
        }
    }

    return {
        success: true,
        message: `Статус аудитории ${parsed.data} получен.`,
        status: {
            audience: parsed.data,
            enabled: config.enabled,
            tokenSet: !!config.token,
            secretSet: !!config.secretToken,
            webhookUrl: config.webhookUrl || null,
            webhookInfoUrl: webhookInfo?.url || null,
            webhookPendingUpdateCount: webhookInfo?.pending_update_count ?? null,
            webhookLastErrorDate: webhookInfo?.last_error_date ?? null,
            webhookLastErrorMessage: webhookInfo?.last_error_message ?? null,
            updatedAt: new Date().toISOString(),
        },
    };
};

export const registerTelegramWebhookByAudienceService = async (
    adminUserId: string,
    audience: TelegramAudience
): Promise<{ success: boolean; message: string }> => {
    const actorId = await ensureAdminActor(adminUserId);
    const parsed = TelegramAudienceSchema.safeParse(audience);
    if (!parsed.success) {
        return { success: false, message: 'Неизвестная аудитория webhook.' };
    }
    try {
        const result = await registerTelegramWebhook({ audience: parsed.data });
        await logUserAction(actorId, 'ADMIN_UPDATE_ENV_SETTINGS', { action: 'register_telegram_webhook', audience: parsed.data });
        return { success: true, message: `Webhook (${parsed.data}) зарегистрирован: ${result.webhookUrl}` };
    } catch (e: any) {
        return { success: false, message: e?.message || 'Не удалось зарегистрировать webhook.' };
    }
};

export const clearTelegramWebhookService = async (adminUserId: string): Promise<{ success: boolean; message: string }> => {
    try {
        await ensureAdminActor(adminUserId);
    } catch {
        return { success: false, message: 'Недостаточно прав.' };
    }
    try {
        await clearTelegramWebhook();
        return { success: true, message: 'Webhook удален.' };
    } catch (e: any) {
        return { success: false, message: e?.message || 'Не удалось удалить webhook.' };
    }
};

export const clearTelegramWebhookByAudienceService = async (
    adminUserId: string,
    audience: TelegramAudience
): Promise<{ success: boolean; message: string }> => {
    const actorId = await ensureAdminActor(adminUserId);
    const parsed = TelegramAudienceSchema.safeParse(audience);
    if (!parsed.success) {
        return { success: false, message: 'Неизвестная аудитория webhook.' };
    }
    try {
        await clearTelegramWebhook(parsed.data);
        await logUserAction(actorId, 'ADMIN_UPDATE_ENV_SETTINGS', { action: 'clear_telegram_webhook', audience: parsed.data });
        return { success: true, message: `Webhook (${parsed.data}) удалён.` };
    } catch (e: any) {
        return { success: false, message: e?.message || 'Не удалось удалить webhook.' };
    }
};

export const sendTelegramTestMessageByAudienceService = async (
    adminUserId: string,
    audience: TelegramAudience,
    targetUserId?: string
): Promise<{ success: boolean; message: string }> => {
    const actorId = await ensureAdminActor(adminUserId);
    const parsed = TelegramAudienceSchema.safeParse(audience);
    if (!parsed.success) {
        return { success: false, message: 'Неизвестная аудитория webhook.' };
    }
    const envSettings = await getEnvSettings({ requesterId: actorId, requireAdmin: true });
    const config = resolveTelegramAudienceConfig(envSettings, parsed.data);
    if (!config.token) {
        return { success: false, message: `Токен не задан для аудитории ${parsed.data}.` };
    }

    const recipientId = targetUserId || actorId;
    const recipientDoc = await getDoc(doc(db, 'users', recipientId));
    const recipient = recipientDoc.data() as any;
    if (!recipient?.telegramChatId) {
        return { success: false, message: 'У получателя не привязан Telegram chat_id.' };
    }
    try {
        const bot = new TelegramBot(config.token, { polling: false });
        await bot.sendMessage(recipient.telegramChatId, `Тест ${parsed.data} ✅ ${new Date().toLocaleString()}`);
        await logUserAction(actorId, 'ADMIN_SEND_TELEGRAM_MESSAGE', { audience: parsed.data, targetUserId: recipientId });
        return { success: true, message: `Тестовое сообщение (${parsed.data}) отправлено.` };
    } catch (e: any) {
        return { success: false, message: e?.response?.body?.description || e?.message || 'Ошибка отправки.' };
    }
};

export const pingTelegramBotByAudienceService = async (
    adminUserId: string,
    audience: TelegramAudience = 'default'
): Promise<{ success: boolean; message: string }> => {
    const actorId = await ensureAdminActor(adminUserId);
    const adminDoc = await getDoc(doc(db, 'users', actorId));
    const adminData = adminDoc.data() as any;
    if (!adminData?.telegramChatId) {
        return { success: false, message: 'У админа нет chat_id. Привяжите Telegram.' };
    }
    const envSettings = await getEnvSettings({ requesterId: actorId, requireAdmin: true });
    const config = resolveTelegramAudienceConfig(envSettings, audience);
    const botToken = config.token;
    if (!botToken) {
        return { success: false, message: `Токен не задан для аудитории ${audience}.` };
    }
    try {
        const bot = new TelegramBot(botToken, { polling: false });
        await bot.sendMessage(adminData.telegramChatId, `pong ${audience} ✅ ${new Date().toLocaleString()}`);
        await logUserAction(actorId, 'ADMIN_SEND_TELEGRAM_MESSAGE', { action: 'ping_telegram_bot', audience });
        return { success: true, message: `Ping (${audience}) отправлен в Telegram.` };
    } catch (e: any) {
        return { success: false, message: e?.response?.body?.description || e?.message || 'Ошибка отправки.' };
    }
};

export const pingTelegramWebhookByAudienceService = async (
    adminUserId: string,
    audience: TelegramAudience = 'default'
): Promise<{ success: boolean; message: string }> => {
    const actorId = await ensureAdminActor(adminUserId);
    const adminDoc = await getDoc(doc(db, 'users', actorId));
    const adminData = adminDoc.data() as any;
    const envSettings = await getEnvSettings({ requesterId: actorId, requireAdmin: true });
    const config = resolveTelegramAudienceConfig(envSettings, audience);
    const webhookUrl = config.webhookUrl;
    if (!webhookUrl) {
        return { success: false, message: `Webhook URL не задан для аудитории ${audience}.` };
    }
    const secretToken = config.secretToken || '';
    const chatId = adminData?.telegramChatId || 0;
    const update = {
        update_id: Date.now(),
        message: {
            message_id: Date.now() % 100000,
            date: Math.floor(Date.now() / 1000),
            text: `health_check_${audience}`,
            from: {
                id: adminData?.telegramUserId || 0,
                is_bot: false,
                first_name: adminData?.displayName || 'Admin',
            },
            chat: {
                id: chatId,
                type: 'private',
                first_name: adminData?.displayName || 'Admin',
            },
        },
    };
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-telegram-bot-api-secret-token': secretToken,
            },
            body: JSON.stringify(update),
        });
        if (!response.ok) {
            const text = await response.text();
            return { success: false, message: `Webhook ответил ${response.status}: ${text || 'ошибка'}` };
        }
        await logUserAction(actorId, 'ADMIN_UPDATE_ENV_SETTINGS', { action: 'ping_telegram_webhook', audience });
        return { success: true, message: `Webhook пинг (${audience}) успешен.` };
    } catch (e: any) {
        return { success: false, message: e?.message || 'Не удалось выполнить ping.' };
    }
};

export const pingTelegramBot = async (adminUserId: string): Promise<{ success: boolean; message: string }> =>
    pingTelegramBotByAudienceService(adminUserId, 'default');

export const pingTelegramWebhookEndpoint = async (adminUserId: string): Promise<{ success: boolean; message: string }> =>
    pingTelegramWebhookByAudienceService(adminUserId, 'default');

export const getVkBotStatus = async (adminUserId: string): Promise<{ success: boolean; status?: any; message?: string }> => {
    try {
        await ensureAdminActor(adminUserId);
        const status = await getVkCallbackStatus();
        return { success: true, status };
    } catch (error: any) {
        return { success: false, message: error?.message || 'Не удалось получить VK статус.' };
    }
};

export const testVkApiConnection = async (adminUserId: string): Promise<{ success: boolean; message: string }> => {
    try {
        await ensureAdminActor(adminUserId);
        const result = await pingVkApi();
        const group = Array.isArray(result?.result) ? result.result[0] : result?.result;
        return { success: true, message: `VK API OK: ${group?.name || group?.screen_name || 'group'}` };
    } catch (error: any) {
        return { success: false, message: error?.message || 'VK API недоступен.' };
    }
};

export const registerVkWebhookService = async (adminUserId: string): Promise<{ success: boolean; message: string }> => {
    try {
        const actorId = await ensureAdminActor(adminUserId);
        const result = await registerVkCallbackServer();
        await logUserAction(actorId, 'ADMIN_UPDATE_ENV_SETTINGS', { action: 'register_vk_callback', serverId: result.serverId || null });
        return { success: true, message: result.serverId ? `VK callback server зарегистрирован: ${result.serverId}` : 'VK callback server обновлен.' };
    } catch (error: any) {
        return { success: false, message: error?.message || 'Не удалось зарегистрировать VK callback server.' };
    }
};

export const deleteVkWebhookService = async (adminUserId: string, serverId?: number | string): Promise<{ success: boolean; message: string }> => {
    try {
        const actorId = await ensureAdminActor(adminUserId);
        const result = await deleteVkCallbackServer(serverId);
        await logUserAction(actorId, 'ADMIN_UPDATE_ENV_SETTINGS', { action: 'delete_vk_callback', serverId: result.serverId || null });
        return { success: true, message: result.serverId ? `VK callback server удален: ${result.serverId}` : 'VK callback server не найден.' };
    } catch (error: any) {
        return { success: false, message: error?.message || 'Не удалось удалить VK callback server.' };
    }
};

export const sendVkTestMessageService = async (
    adminUserId: string,
    targetUserId?: string,
): Promise<{ success: boolean; message: string }> => {
    try {
        const actorId = await ensureAdminActor(adminUserId);
        const recipientId = targetUserId || actorId;
        const recipientDoc = await getDoc(doc(db, 'users', recipientId));
        const recipient = recipientDoc.data() as any;
        const peerId = recipient?.vkPeerId || recipient?.vkId;
        if (!peerId) {
            return { success: false, message: 'У получателя нет связанного VK peer_id.' };
        }
        await sendVkMessage({
            peerId,
            message: `Тест VK ✅ ${new Date().toLocaleString()}`,
        });
        await logUserAction(actorId, 'ADMIN_SEND_VK_MESSAGE', { action: 'send_vk_test_message', targetUserId: recipientId });
        return { success: true, message: 'Тестовое сообщение в VK отправлено.' };
    } catch (error: any) {
        return { success: false, message: error?.message || 'Не удалось отправить VK сообщение.' };
    }
};


// --- DANGER ZONE ---

const COLLECTIONS_TO_WIPE = [
    'users',
    'requests',
    'companies',
    'priceBaseItems',
    'user_logs',
    'bug_reports',
    'notifications',
    'file_analysis_cache',
    'file_markdown_cache'
];

export const wipeAllData = async (currentUserId: string): Promise<{ success: boolean; message: string; }> => {
    let actorId = currentUserId;
    try {
        actorId = await ensureAdminActor(currentUserId);
        let deletedDocsCount = 0;

        for (const collectionName of COLLECTIONS_TO_WIPE) {
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);
            
            const batch = writeBatch(db);
            let batchSize = 0;

            for (const docSnap of snapshot.docs) {
                 // CRITICAL: Do not delete the super admin's own user document
                if (collectionName === 'users' && docSnap.id === actorId) {
                    continue;
                }
                
                batch.delete(docSnap.ref);
                batchSize++;
                deletedDocsCount++;

                if (batchSize >= 499) { // Safety limit for batched writes
                    await batch.commit();
                    // batch = writeBatch(db); // Re-initialization is tricky inside a loop, for very large dbs a more robust solution would be needed
                    batchSize = 0;
                     // Re-initialization is tricky inside a loop, for very large dbs a more robust solution would be needed
                }
            }
            
            if (batchSize > 0) {
                 await batch.commit();
            }
        }
        
        await logUserAction(actorId, 'ADMIN_WIPE_ALL_DATA', { deletedDocsCount });
        return { success: true, message: `Операция завершена. Удалено ${deletedDocsCount} документов.`};

    } catch (error: any) {
        console.error("Error wiping all data:", error);
        return { success: false, message: error.message || "Произошла критическая ошибка при удалении данных." };
    }
};

// --- Bulk User Update ---
const BulkUpdateSchema = z.object({
  model: z.string().min(1),
  filterType: z.enum(['plan', 'role']),
  filterValue: z.string().min(1),
});

export async function updateUsersInBulk(data: z.infer<typeof BulkUpdateSchema>) {
    try {
        await ensureAdminActor();
    } catch (e: any) {
        return { success: false, message: e.message || 'Недостаточно прав.' };
    }
    const validation = BulkUpdateSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: "Неверные данные для массового обновления." };
    }
    const { model, filterType, filterValue } = validation.data;

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where(filterType === 'plan' ? 'plan' : 'systemRole', '==', filterValue));
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return { success: false, message: "Не найдено пользователей по заданным критериям." };
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
            const userRef = doc(db, 'users', docSnap.id);
            const userData = docSnap.data() as AppUser;
            const currentModels = new Set(userData.availableModels || []);
            currentModels.add(model);
            batch.update(userRef, { availableModels: Array.from(currentModels) });
        });

        await batch.commit();

        return { success: true, message: `Модель "${model}" успешно добавлена для ${snapshot.size} пользователей.` };

    } catch (error: any) {
        console.error("Bulk user update error:", error);
        return { success: false, message: error.message || "Произошла ошибка при обновлении." };
    }
}

// --- Dashboard Stats ---
export const getAiApiStats = async (hours: number) => {
    try {
        const now = Timestamp.now();
        const startTime = Timestamp.fromMillis(now.toMillis() - hours * 60 * 60 * 1000);
        
        const logsRef = collection(db, 'ai_api_logs');
        const q = query(logsRef, where('timestamp', '>=', startTime));
        const snapshot = await getDocs(q);

        const statsByModel: Record<string, { totalCalls: number; successCalls: number; errorCalls: number; totalCost: number }> = {};
        
        snapshot.forEach(doc => {
            const logData = doc.data();
            const model = logData.model || 'unknown';

            if (!statsByModel[model]) {
                statsByModel[model] = { totalCalls: 0, successCalls: 0, errorCalls: 0, totalCost: 0 };
            }

            statsByModel[model].totalCalls++;
            if (logData.status === 'success') statsByModel[model].successCalls++;
            else statsByModel[model].errorCalls++;
            statsByModel[model].totalCost += logData.totalCost || 0;
        });

        const totalCalls = snapshot.size;
        const successCalls = snapshot.docs.filter(d => d.data().status === 'success').length;
        const errorCalls = totalCalls - successCalls;
        const totalCost = snapshot.docs.reduce((acc, doc) => acc + (doc.data().totalCost || 0), 0);

        return { 
            success: true, 
            totalCalls, 
            successCalls, 
            errorCalls, 
            totalCost,
            statsByModel: Object.entries(statsByModel).map(([model, data]) => ({ model, ...data }))
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
};

export const getFeedbackStats = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'survey_responses'));
        
        const ratingsByModel: Record<string, { ratings: number[], count: number }> = {};

        snapshot.forEach(doc => {
            const response = doc.data() as SurveyResponse;
            if (response.model && response.rating) {
                if (!ratingsByModel[response.model]) {
                    ratingsByModel[response.model] = { ratings: [], count: 0 };
                }
                ratingsByModel[response.model].ratings.push(response.rating);
                ratingsByModel[response.model].count++;
            }
        });

        const averageRatings = Object.entries(ratingsByModel).map(([model, data]) => ({
            model,
            averageRating: data.ratings.reduce((a, b) => a + b, 0) / data.count,
            count: data.count,
        }));

        return { success: true, averageRatings };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
};

// --- S3 Management ---

type BucketType = 'default' | 'analysis' | 'personal' | 'avatars' | 'user_docs' | 'project_docs';
type CorsTarget = {
    presetId?: string;
    bucketType?: BucketType;
    bucketName?: string;
};

const normalizeCorsTarget = (target?: string | CorsTarget): CorsTarget => {
    if (!target) return {};
    if (typeof target === 'string') {
        return { presetId: target };
    }
    return target;
};

export async function getS3Client(
    preferredPresetId?: string,
    options?: { bucketType?: BucketType; allowBucketless?: boolean }
): Promise<{
    s3Client: S3Client;
    settings: EnvSettings;
    config: {
        endpoint?: string;
        region?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
        bucketName?: string;
        tenantId?: string;
        bucketIsPublic?: boolean;
        presignedUrlExpiration?: number;
        provider?: string;
    };
    presetId?: string;
}> {
    const settings = await getEnvSettings({ allowInternal: true });
    const bucketType = options?.bucketType || 'default';

    const resolveConfig = (presetId?: string) => {
        const preset = settings.s3Presets?.find((p) => p.id === presetId);
        const cfg = preset?.config || {};
        const endpoint = cfg.s3Endpoint ?? settings.s3Endpoint;
        const provider = preset?.provider || (endpoint?.includes('cloud.ru') ? 'cloudru' : undefined);
        const resolved = {
            endpoint,
            region: cfg.s3Region ?? settings.s3Region,
            accessKeyId: cfg.s3AccessKeyId ?? settings.s3AccessKeyId,
            secretAccessKey: cfg.s3SecretAccessKey ?? settings.s3SecretAccessKey,
            bucketName: cfg.s3BucketName ?? settings.s3BucketName,
            tenantId: cfg.s3TenantId ?? settings.s3TenantId,
            bucketIsPublic: cfg.s3BucketIsPublic ?? settings.s3BucketIsPublic,
            presignedUrlExpiration: cfg.s3PresignedUrlExpiration ?? settings.s3PresignedUrlExpiration,
            provider,
        };
        return resolved;
    };

    const resolveBucketForPurpose = (cfg: ReturnType<typeof resolveConfig>) => {
        if (bucketType === 'analysis' || bucketType === 'default') {
            return {
                bucketName: cfg.bucketName,
                bucketIsPublic: cfg.bucketIsPublic,
            };
        }
        if (bucketType === 'personal') {
            return {
                bucketName: settings.s3PersonalBucketName || cfg.bucketName,
                bucketIsPublic: settings.s3PersonalBucketIsPublic ?? cfg.bucketIsPublic,
            };
        }
        if (bucketType === 'avatars') {
            return {
                bucketName: settings.s3AvatarBucketName || settings.s3PersonalBucketName || cfg.bucketName,
                bucketIsPublic: settings.s3AvatarBucketIsPublic ?? settings.s3PersonalBucketIsPublic ?? cfg.bucketIsPublic,
            };
        }
        if (bucketType === 'user_docs') {
            return {
                bucketName: settings.s3UserDocsBucketName || cfg.bucketName,
                bucketIsPublic: settings.s3UserDocsBucketIsPublic ?? cfg.bucketIsPublic,
            };
        }
        if (bucketType === 'project_docs') {
            return {
                bucketName: settings.s3ProjectDocsBucketName || cfg.bucketName,
                bucketIsPublic: settings.s3ProjectDocsBucketIsPublic ?? cfg.bucketIsPublic,
            };
        }
        return {
            bucketName: cfg.bucketName,
            bucketIsPublic: cfg.bucketIsPublic,
        };
    };

    const resolveSecondaryRouteTarget = () => {
        if (bucketType === 'analysis' || bucketType === 'default') {
            return {
                explicit: !!settings.s3AnalysisSecondaryPresetId,
                presetId: settings.s3AnalysisSecondaryPresetId || settings.s3SecondaryPresetId,
                bucketName: settings.s3AnalysisSecondaryBucketName || settings.s3BucketName,
            };
        }
        if (bucketType === 'avatars') {
            return {
                explicit: !!settings.s3AvatarSecondaryPresetId,
                presetId: settings.s3AvatarSecondaryPresetId || settings.s3SecondaryPresetId,
                bucketName: settings.s3AvatarSecondaryBucketName || settings.s3AvatarBucketName || settings.s3PersonalBucketName,
            };
        }
        if (bucketType === 'user_docs') {
            return {
                explicit: !!settings.s3UserDocsSecondaryPresetId,
                presetId: settings.s3UserDocsSecondaryPresetId || settings.s3SecondaryPresetId,
                bucketName: settings.s3UserDocsSecondaryBucketName || settings.s3UserDocsBucketName,
            };
        }
        if (bucketType === 'project_docs') {
            return {
                explicit: !!settings.s3ProjectDocsSecondaryPresetId,
                presetId: settings.s3ProjectDocsSecondaryPresetId || settings.s3SecondaryPresetId,
                bucketName: settings.s3ProjectDocsSecondaryBucketName || settings.s3ProjectDocsBucketName,
            };
        }
        return {
            explicit: false,
            presetId: settings.s3SecondaryPresetId,
            bucketName: settings.s3BucketName,
        };
    };

    const resolvePresetForPurpose = () => {
        if (preferredPresetId) return preferredPresetId;
        if (bucketType === 'avatars' && settings.s3AvatarPresetId) return settings.s3AvatarPresetId;
        if (bucketType === 'user_docs' && settings.s3UserDocsPresetId) return settings.s3UserDocsPresetId;
        if (bucketType === 'project_docs' && settings.s3ProjectDocsPresetId) return settings.s3ProjectDocsPresetId;
        return settings.s3ActivePresetId;
    };

    const tryCreate = (presetId?: string, bucketNameOverride?: string) => {
        const cfg = resolveConfig(presetId);
        const resolvedBucket = resolveBucketForPurpose(cfg);
        const bucketName = bucketNameOverride || resolvedBucket.bucketName;
        const bucketIsPublic = resolvedBucket.bucketIsPublic;
        if (!settings.s3StorageEnabled || !cfg.endpoint || !cfg.region || !cfg.accessKeyId || !cfg.secretAccessKey) {
            throw new Error("S3 storage is not configured or enabled completely in the admin panel.");
        }
        if (!options?.allowBucketless && !bucketName) {
            throw new Error("S3 bucket name is not configured for the selected purpose.");
        }
        const shouldUseTenant = cfg.provider === 'cloudru' && !!cfg.tenantId;
        const accessKeyId = shouldUseTenant ? `${cfg.tenantId}:${cfg.accessKeyId}` : cfg.accessKeyId;
        const s3Client = new S3Client({
          region: cfg.region,
          endpoint: cfg.endpoint,
          credentials: {
            accessKeyId,
            secretAccessKey: cfg.secretAccessKey,
          },
          forcePathStyle: true,
        });
        return { s3Client, presetId, settings, config: { ...cfg, bucketName, bucketIsPublic } };
    };

    try {
        const presetId = resolvePresetForPurpose();
        return tryCreate(presetId);
    } catch (primaryError) {
        const secondaryTarget = resolveSecondaryRouteTarget();
        if (secondaryTarget.presetId && (secondaryTarget.explicit || settings.s3SecondaryEnabled)) {
            try {
                return tryCreate(secondaryTarget.presetId, secondaryTarget.bucketName);
            } catch (fallbackError) {
                throw primaryError;
            }
        }
        throw primaryError;
    }
}

export const testS3Connection = async (presetId?: string): Promise<{ success: boolean; message: string; }> => {
    try {
        const { s3Client } = await getS3Client(presetId, { allowBucketless: true });
        await s3Client.send(new ListBucketsCommand({}));
        return { success: true, message: "Соединение с S3 успешно установлено." };
    } catch(e: any) {
        return { success: false, message: `Ошибка соединения: ${e.message}` };
    }
};

export const listBuckets = async (presetId?: string): Promise<{ success: boolean; message: string; buckets?: string[]; }> => {
    try {
        const { s3Client } = await getS3Client(presetId, { allowBucketless: true });
        const { Buckets } = await s3Client.send(new ListBucketsCommand({}));
        return { success: true, message: "Список бакетов получен.", buckets: Buckets?.map(b => b.Name || '') || [] };
    } catch (e: any) {
        return { success: false, message: `Ошибка получения списка: ${e.message}` };
    }
};

export const createBucket = async ({ bucketName, presetId }: { bucketName: string, presetId?: string }): Promise<{ success: boolean; message: string; }> => {
    try {
        const { s3Client } = await getS3Client(presetId, { allowBucketless: true });
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        return { success: true, message: `Бакет "${bucketName}" успешно создан.` };
    } catch (e: any) {
         return { success: false, message: `Ошибка создания: ${e.message}` };
    }
};

export const deleteBucket = async ({ bucketName, presetId }: { bucketName: string, presetId?: string }): Promise<{ success: boolean; message: string; }> => {
    try {
        const { s3Client } = await getS3Client(presetId, { allowBucketless: true });
        await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
        return { success: true, message: `Бакет "${bucketName}" удалён.` };
    } catch (e: any) {
        return { success: false, message: `Ошибка удаления: ${e.message}` };
    }
};

export const getBucketCors = async (target?: string | CorsTarget): Promise<{ success: boolean; message: string; config?: string }> => {
    try {
        const normalizedTarget = normalizeCorsTarget(target);
        const { s3Client, config } = await getS3Client(normalizedTarget.presetId, { bucketType: normalizedTarget.bucketType });
        const targetBucket = normalizedTarget.bucketName || config.bucketName;
        if (!targetBucket) {
            return { success: false, message: 'Не задан бакет для получения CORS.' };
        }
        const { CORSRules } = await s3Client.send(new GetBucketCorsCommand({ Bucket: targetBucket }));
        
        const parser = new XMLBuilder({ format: true, ignoreAttributes: false });
        const xml = parser.build({ CORSConfiguration: { CORSRule: CORSRules } });

        return { success: true, message: "CORS-правила успешно получены.", config: xml };
    } catch(e: any) {
        if(e.name === 'NoSuchCORSConfiguration') {
            return { success: true, message: 'CORS-правила для этого бакета не установлены.', config: ''};
        }
        return { success: false, message: `Ошибка получения CORS: ${e.message}` };
    }
};

export const putBucketCors = async ({ corsXml }: { corsXml: string }): Promise<{ success: boolean; message: string; }> => {
    try {
        if (!corsXml || !corsXml.trim()) {
            return { success: false, message: "CORS XML пустой." };
        }
        const { s3Client, config } = await getS3Client();
        let jsonObj: any;
        try {
            const parser = new XMLParser({ ignoreAttributes: false });
            jsonObj = parser.parse(corsXml);
        } catch (parseError: any) {
            return { success: false, message: `Ошибка парсинга XML: ${parseError?.message || 'Некорректный XML.'}` };
        }
        const corsRule = jsonObj?.CORSConfiguration?.CORSRule;
        const corsRulesArray = Array.isArray(corsRule) ? corsRule : corsRule ? [corsRule] : [];
        if (!corsRulesArray.length) {
            return { success: false, message: "В CORS XML не найден CORSRule." };
        }

        const toArray = (value: unknown) => Array.isArray(value) ? value : value == null ? [] : [value];
        const normalizedRules = corsRulesArray.map((rule) => ({
            ...rule,
            AllowedOrigin: toArray(rule.AllowedOrigin),
            AllowedMethod: toArray(rule.AllowedMethod),
            AllowedHeader: toArray(rule.AllowedHeader),
            ExposeHeader: toArray(rule.ExposeHeader),
        }));

        await s3Client.send(new PutBucketCorsCommand({
            Bucket: config.bucketName!,
            CORSConfiguration: {
                CORSRules: normalizedRules
            }
        }));
        return { success: true, message: "CORS-правила успешно обновлены." };
    } catch(e: any) {
        const details = [
            e?.name ? `name: ${e.name}` : null,
            e?.Code ? `code: ${e.Code}` : null,
            e?.$metadata?.httpStatusCode ? `status: ${e.$metadata.httpStatusCode}` : null,
        ].filter(Boolean).join(', ');
        const suffix = details ? ` (${details})` : '';
        return { success: false, message: `Ошибка установки CORS: ${e?.message || 'Неизвестная ошибка.'}${suffix}` };
    }
};

export const putBucketCorsForTarget = async ({
    corsXml,
    target,
}: {
    corsXml: string;
    target?: string | CorsTarget;
}): Promise<{ success: boolean; message: string; }> => {
    try {
        if (!corsXml || !corsXml.trim()) {
            return { success: false, message: "CORS XML пустой." };
        }
        const normalizedTarget = normalizeCorsTarget(target);
        const { s3Client, config } = await getS3Client(normalizedTarget.presetId, { bucketType: normalizedTarget.bucketType });
        const targetBucket = normalizedTarget.bucketName || config.bucketName;
        if (!targetBucket) {
            return { success: false, message: "Не задан бакет для установки CORS." };
        }

        let jsonObj: any;
        try {
            const parser = new XMLParser({ ignoreAttributes: false });
            jsonObj = parser.parse(corsXml);
        } catch (parseError: any) {
            return { success: false, message: `Ошибка парсинга XML: ${parseError?.message || 'Некорректный XML.'}` };
        }
        const corsRule = jsonObj?.CORSConfiguration?.CORSRule;
        const corsRulesArray = Array.isArray(corsRule) ? corsRule : corsRule ? [corsRule] : [];
        if (!corsRulesArray.length) {
            return { success: false, message: "В CORS XML не найден CORSRule." };
        }

        const toArray = (value: unknown) => Array.isArray(value) ? value : value == null ? [] : [value];
        const normalizedRules = corsRulesArray.map((rule) => ({
            ...rule,
            AllowedOrigin: toArray(rule.AllowedOrigin),
            AllowedMethod: toArray(rule.AllowedMethod),
            AllowedHeader: toArray(rule.AllowedHeader),
            ExposeHeader: toArray(rule.ExposeHeader),
        }));

        await s3Client.send(new PutBucketCorsCommand({
            Bucket: targetBucket,
            CORSConfiguration: {
                CORSRules: normalizedRules
            }
        }));
        return { success: true, message: `CORS-правила обновлены для бакета "${targetBucket}".` };
    } catch (e: any) {
        const details = [
            e?.name ? `name: ${e.name}` : null,
            e?.Code ? `code: ${e.Code}` : null,
            e?.$metadata?.httpStatusCode ? `status: ${e.$metadata.httpStatusCode}` : null,
        ].filter(Boolean).join(', ');
        const suffix = details ? ` (${details})` : '';
        return { success: false, message: `Ошибка установки CORS: ${e?.message || 'Неизвестная ошибка.'}${suffix}` };
    }
};

export const deleteBucketCors = async (target?: string | CorsTarget): Promise<{ success: boolean; message: string; }> => {
    try {
        const normalizedTarget = normalizeCorsTarget(target);
        const { s3Client, config } = await getS3Client(normalizedTarget.presetId, { bucketType: normalizedTarget.bucketType });
        const targetBucket = normalizedTarget.bucketName || config.bucketName;
        if (!targetBucket) {
            return { success: false, message: "Не задан бакет для удаления CORS." };
        }
        await s3Client.send(new DeleteBucketCorsCommand({ Bucket: targetBucket }));
        return { success: true, message: "CORS-правила успешно удалены." };
    } catch (e: any) {
        return { success: false, message: `Ошибка удаления CORS: ${e.message}` };
    }
};

// --- Survey Management ---
export const getSurveys = async (): Promise<Survey[]> => {
    const q = query(collection(db, 'surveys'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Survey));
};

export const getNotifications = async (): Promise<Notification[]> => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};

export const createOrUpdateNotification = async (userId: string, data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'publishedAt'>, notificationId?: string): Promise<{ success: boolean, message: string }> => {
    try {
        if (notificationId) {
            const docRef = doc(db, 'notifications', notificationId);
            await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
            return { success: true, message: "Уведомление обновлено." };
        } else {
            const docRef = doc(collection(db, 'notifications'));
            await setDoc(docRef, { 
                ...data, 
                createdBy: userId,
                createdAt: serverTimestamp(), 
                publishedAt: data.status === 'published' ? serverTimestamp() : null 
            });
            return { success: true, message: "Уведомление создано." };
        }
    } catch (error: any) {
        return { success: false, message: error.message || "Не удалось сохранить уведомление." };
    }
};

export const deleteNotification = async (notificationId: string): Promise<{ success: boolean, message: string }> => {
    try {
        await deleteDoc(doc(db, 'notifications', notificationId));
        return { success: true, message: "Уведомление удалено." };
    } catch (error: any) {
        return { success: false, message: error.message || "Не удалось удалить уведомление." };
    }
};

export const createOrUpdateSurvey = async (userId: string, surveyData: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>, surveyId?: string): Promise<{ success: boolean, message: string }> => {
    try {
        if (surveyId) {
            const docRef = doc(db, 'surveys', surveyId);
            await updateDoc(docRef, { ...surveyData, updatedAt: serverTimestamp() });
            return { success: true, message: "Опрос успешно обновлен." };
        } else {
            const docRef = doc(collection(db, 'surveys'));
            await setDoc(docRef, { ...surveyData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            return { success: true, message: "Опрос успешно создан." };
        }
    } catch (error: any) {
        return { success: false, message: error.message || "Не удалось сохранить опрос." };
    }
};

export const deleteSurvey = async (surveyId: string): Promise<{ success: boolean, message: string }> => {
    try {
        await deleteDoc(doc(db, 'surveys', surveyId));
        return { success: true, message: "Опрос удален." };
    } catch (error: any) {
        return { success: false, message: error.message || "Не удалось удалить опрос." };
    }
};

// --- Banner Management ---
export const getBannerConfig = async (): Promise<BannerConfig> => {
    try {
        const configRef = doc(db, 'configs', 'stickyBanner');
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
            return docSnap.data() as BannerConfig;
        }
        return { enabled: false, text: '', buttonText: '', buttonLink: '' };
    } catch (error) {
        console.error("Error getting banner config:", error);
        return { enabled: false, text: '', buttonText: '', buttonLink: '' };
    }
};

export const updateBannerConfig = async (userId: string, config: BannerConfig): Promise<{ success: boolean; message: string }> => {
    try {
        await setDoc(doc(db, 'configs', 'stickyBanner'), config);
        await logUserAction(userId, 'ADMIN_UPDATE_SETTINGS', { updatedSettings: 'stickyBanner' });
        return { success: true, message: 'Настройки баннера обновлены.' };
    } catch (error: any) {
        console.error("Error updating banner config:", error);
        return { success: false, message: 'Ошибка обновления.' };
    }
};

// --- Knowledge Base Management ---
export interface KnowledgeBaseArticle {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    order: number;
}
export const getKnowledgeBaseArticles = async (): Promise<KnowledgeBaseArticle[]> => {
    const q = query(collection(db, 'knowledge_base_articles'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeBaseArticle));
};

export const updateKnowledgeBaseArticle = async (articleId: string, updates: Partial<KnowledgeBaseArticle>): Promise<{ success: boolean; message: string; }> => {
    try {
        await updateDoc(doc(db, 'knowledge_base_articles', articleId), updates);
        return { success: true, message: 'Статья обновлена' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
};
