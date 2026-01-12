// src/actions/adminActions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, writeBatch, getDoc, serverTimestamp, query, where, orderBy, setDoc, deleteDoc, addDoc, limit, Timestamp } from '@/lib/mongoFirestoreServer';
import { type AppUser, type SystemRole, type UserPlan, type HistoryRequest, type Company, type Notification, type Survey, SurveyResponse, BannerConfig } from '@/contexts/AppContext';
import { promises as fs } from 'fs';
import path from 'path';
import { LegalEntitySchema, type LegalEntity } from '@/ai/genkit-schemas';
import TelegramBot from 'node-telegram-bot-api';
import { nanoid } from 'nanoid';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { S3Client, PutObjectCommand, GetObjectCommand, GetBucketCorsCommand, PutBucketCorsCommand, DeleteBucketCorsCommand, ListBucketsCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logUserAction, logAiApiCall, type ActionType } from '@/lib/logger';


// This fix is necessary for node-telegram-bot-api to work correctly with Buffers in some environments.
process.env.NTBA_FIX_350 = '1';

// Helper to get Super Admin Email from settings first, then env
async function getSuperAdminEmail(): Promise<string | undefined> {
    const envSettings = await getEnvSettings();
    return envSettings.superAdminEmail || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
}

export const getAllUsers = async (): Promise<AppUser[]> => {
    // Verification is now done on the client-side before calling this action.
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
  
  const targetUserDoc = await getDoc(doc(db, 'users', targetUid));
  const targetUserData = targetUserDoc.data();
  
  const superAdminEmail = await getSuperAdminEmail();

  // Protect the designated Super Admin from being demoted by anyone.
  if (!!superAdminEmail && targetUserData?.email === superAdminEmail && updates.systemRole && updates.systemRole !== 'Super Admin') {
      return { success: false, message: 'Роль этого Супер-администратора защищена и не может быть изменена.' };
  }

  // Prevent Super Admin from demoting themselves, but allow other self-edits.
  if (currentUserId === targetUid && 'systemRole' in updates && updates.systemRole !== 'Super Admin') {
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

    await logUserAction(currentUserId, 'ADMIN_UPDATE_USER', {
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
  
  try {
    const userRef = doc(db, 'users', targetUid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
        return { success: false, message: 'Пользователь не найден.' };
    }

    const currentCredits = userDoc.data().credits || 0;
    const newCredits = currentCredits + amount;

    await updateDoc(userRef, { 
        credits: newCredits,
        updatedAt: serverTimestamp() 
    });

    await logUserAction(currentUserId, 'ADMIN_ADD_CREDITS', {
      targetUserId: targetUid,
      amountAdded: amount,
      newBalance: newCredits,
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

    const targetUserDoc = await getDoc(doc(db, 'users', targetUid));
    const targetUserData = targetUserDoc.data();
    const superAdminEmail = await getSuperAdminEmail();

    if (!!superAdminEmail && targetUserData?.email === superAdminEmail && status === 'blocked') {
        return { success: false, message: 'Этот Супер-администратор защищен и не может быть заблокирован.' };
    }

    if (currentUserId === targetUid) {
        return { success: false, message: 'Супер-администратор не может заблокировать сам себя.' };
    }

    try {
        const userRef = doc(db, 'users', targetUid);
        await updateDoc(userRef, { 
            status: status,
            updatedAt: serverTimestamp() 
        });

        await logUserAction(currentUserId, 'ADMIN_SET_USER_STATUS', {
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

    const targetUserDoc = await getDoc(doc(db, 'users', targetUid));
    const targetUserData = targetUserDoc.data();
    const superAdminEmail = await getSuperAdminEmail();
    if (!!superAdminEmail && targetUserData?.email === superAdminEmail) {
        return { success: false, message: 'Этот Супер-администратор защищен и не может быть архивирован.' };
    }


    if (currentUserId === targetUid) {
        return { success: false, message: 'Супер-администратор не может архивировать сам себя.' };
    }
    
    try {
        const userRef = doc(db, 'users', targetUid);
        await updateDoc(userRef, { 
            archivedAt: serverTimestamp(),
            status: 'blocked'
        });
        
        await logUserAction(currentUserId, 'ADMIN_ARCHIVE_USER', {
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
    
    const ticketRef = doc(db, 'requests', ticketId);
    const userRef = doc(db, 'users', userId);

    try {
        const batch = writeBatch(db);

        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            throw new Error('Пользователь для возврата кредита не найден.');
        }
        const currentCredits = userDoc.data().credits || 0;
        const newCredits = currentCredits + creditAmount;
        batch.update(userRef, { credits: newCredits });

        batch.update(ticketRef, { 
            status: 'success', 
            resolvedAt: serverTimestamp(),
            resolvedBy: currentUserId,
        });
        
        await batch.commit();
        
        await logUserAction(currentUserId, 'ADMIN_RESOLVE_TICKET', {
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
}

const AppSettingsSchema = z.object({
    enterpriseEmail: z.string().email('Неверный формат email.').min(1, 'Email не может быть пустым.'),
});

export const getAppSettings = async (): Promise<AppSettings> => {
    try {
        const settingsRef = doc(db, 'configs', 'appSettings');
        const docSnap = await getDoc(settingsRef);

        if (docSnap.exists()) {
            return docSnap.data() as AppSettings;
        } else {
            // Return default empty state if document doesn't exist
            return { enterpriseEmail: '' };
        }
    } catch (error) {
        console.error("Error getting app settings:", error);
        // Return default empty state on error
        return { enterpriseEmail: '' };
    }
};

export const updateAppSettings = async (currentUserId: string, data: AppSettings): Promise<{ success: boolean; message: string }> => {
    const validation = AppSettingsSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: validation.error.flatten().fieldErrors.enterpriseEmail?.[0] || 'Неверные данные.' };
    }
    
    try {
        const settingsRef = doc(db, 'configs', 'appSettings');
        await setDoc(settingsRef, validation.data, { merge: true });

        await logUserAction(currentUserId, 'ADMIN_UPDATE_SETTINGS', {
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
  plan: z.enum(['PRO', 'Business', 'Enterprise']),
});

export const activateTrial = async (data: z.infer<typeof ActivateTrialSchema>): Promise<{ success: boolean; message: string }> => {
    const validation = ActivateTrialSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Неверные данные для активации триала.' };
    }

    const { userId, plan } = validation.data;
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
export const getLegalEntity = async (): Promise<LegalEntity | null> => {
    try {
        const docRef = doc(db, 'configs', 'legalEntity');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as LegalEntity;
        }
        return null; // Return null if not found
    } catch (error) {
        console.error("Error getting legal entity:", error);
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
  targetUserChatId: z.number(),
  message: z.string().min(1, "Сообщение не может быть пустым."),
});

export const sendTelegramMessageToUser = async (data: z.infer<typeof SendTelegramMessageSchema>): Promise<{ success: boolean; message: string }> => {
  const validation = SendTelegramMessageSchema.safeParse(data);
  if (!validation.success) {
    const error = validation.error.flatten().fieldErrors.message?.[0];
    return { success: false, message: error || 'Неверные данные.' };
  }

  const envSettings = await getEnvSettings();
  const botToken = envSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not configured.");
    return { success: false, message: "Сервер не настроен для работы с Telegram." };
  }

  const { targetUserChatId, message } = validation.data;

  try {
    const bot = new TelegramBot(botToken);
    await bot.sendMessage(targetUserChatId, message);
    
    // Log the action without awaiting
    logUserAction(validation.data.adminUserId, 'ADMIN_SEND_TELEGRAM_MESSAGE', {
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
export interface AiAgentConfig {
  providers: Record<string, { name: string; baseUrl: string; pdfProcessingPriority?: ('native' | 'mistral-ocr' | 'pdf-text')[] }>;
  apiModels: any[];
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
    dadataApiKey?: string;
    dadataApiSecret?: string;
    openRouterApiKey?: string;
    defaultFallbackModel?: string;
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
}

const EnvSettingsSchema = z.object({
    superAdminEmail: z.string().email('Неверный формат email.').optional().or(z.literal('')),
    telegramBotToken: z.string().optional().or(z.literal('')),
    nextPublicTelegramBotUrl: z.string().url('Неверный URL.').optional().or(z.literal('')),
    dadataApiKey: z.string().optional().or(z.literal('')),
    dadataApiSecret: z.string().optional().or(z.literal('')),
    openRouterApiKey: z.string().optional().or(z.literal('')),
    defaultFallbackModel: z.string().optional().or(z.literal('')),
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
});

export const getEnvSettings = async (): Promise<EnvSettings> => {
    try {
        const settingsRef = doc(db, 'configs', 'envSettings');
        const docSnap = await getDoc(settingsRef);

        if (docSnap.exists()) {
            return docSnap.data() as EnvSettings;
        }
        return {};
    } catch (error) {
        console.error("Error getting env settings:", error);
        return {};
    }
};

export const updateEnvSettings = async (currentUserId: string, data: EnvSettings): Promise<{ success: boolean; message: string }> => {
    const validation = EnvSettingsSchema.safeParse(data);
    if (!validation.success) {
        // Find the first error message to display
        const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, message: firstError || 'Неверные данные.' };
    }
    
    try {
        const settingsRef = doc(db, 'configs', 'envSettings');
        await setDoc(settingsRef, validation.data, { merge: true });
        await logUserAction(currentUserId, 'ADMIN_UPDATE_ENV_SETTINGS', {});
        return { success: true, message: 'Переменные окружения успешно обновлены. Изменения могут примениться не сразу.' };
    } catch (error) {
        console.error("Error updating env settings:", error);
        return { success: false, message: 'Ошибка при обновлении переменных.' };
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
    'file_analysis_cache'
];

export const wipeAllData = async (currentUserId: string): Promise<{ success: boolean; message: string; }> => {
    try {
        let deletedDocsCount = 0;

        for (const collectionName of COLLECTIONS_TO_WIPE) {
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);
            
            const batch = writeBatch(db);
            let batchSize = 0;

            for (const docSnap of snapshot.docs) {
                 // CRITICAL: Do not delete the super admin's own user document
                if (collectionName === 'users' && docSnap.id === currentUserId) {
                    continue;
                }
                
                batch.delete(docSnap.ref);
                batchSize++;
                deletedDocsCount++;

                if (batchSize >= 499) { // Firestore batch limit is 500
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
        
        await logUserAction(currentUserId, 'ADMIN_WIPE_ALL_DATA', { deletedDocsCount });
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

export async function getS3Client(): Promise<{ s3Client: S3Client, settings: EnvSettings }> {
    const settings = await getEnvSettings();
    if (!settings.s3StorageEnabled || !settings.s3Endpoint || !settings.s3Region || !settings.s3AccessKeyId || !settings.s3SecretAccessKey || !settings.s3BucketName) {
        throw new Error("S3 storage is not configured or enabled completely in the admin panel.");
    }
    const accessKeyId = settings.s3TenantId ? `${settings.s3TenantId}:${settings.s3AccessKeyId}` : settings.s3AccessKeyId;

    const s3Client = new S3Client({
      region: settings.s3Region,
      endpoint: settings.s3Endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: settings.s3SecretAccessKey,
      },
      forcePathStyle: true,
    });
    return { s3Client, settings };
}

export const testS3Connection = async (): Promise<{ success: boolean; message: string; }> => {
    try {
        const { s3Client } = await getS3Client();
        await s3Client.send(new ListBucketsCommand({}));
        return { success: true, message: "Соединение с S3 успешно установлено." };
    } catch(e: any) {
        return { success: false, message: `Ошибка соединения: ${e.message}` };
    }
};

export const listBuckets = async (): Promise<{ success: boolean; message: string; buckets?: string[]; }> => {
    try {
        const { s3Client } = await getS3Client();
        const { Buckets } = await s3Client.send(new ListBucketsCommand({}));
        return { success: true, message: "Список бакетов получен.", buckets: Buckets?.map(b => b.Name || '') || [] };
    } catch (e: any) {
        return { success: false, message: `Ошибка получения списка: ${e.message}` };
    }
};

export const createBucket = async ({ bucketName }: { bucketName: string }): Promise<{ success: boolean; message: string; }> => {
    try {
        const { s3Client } = await getS3Client();
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        return { success: true, message: `Бакет "${bucketName}" успешно создан.` };
    } catch (e: any) {
         return { success: false, message: `Ошибка создания: ${e.message}` };
    }
};

export const getBucketCors = async (): Promise<{ success: boolean; message: string; config?: string }> => {
    try {
        const { s3Client, settings } = await getS3Client();
        const { CORSRules } = await s3Client.send(new GetBucketCorsCommand({ Bucket: settings.s3BucketName! }));
        
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
        const { s3Client, settings } = await getS3Client();
        const parser = new XMLParser({ ignoreAttributes: false });
        const jsonObj = parser.parse(corsXml);
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
            Bucket: settings.s3BucketName!,
            CORSConfiguration: {
                CORSRules: normalizedRules
            }
        }));
        return { success: true, message: "CORS-правила успешно обновлены." };
    } catch(e: any) {
        return { success: false, message: `Ошибка установки CORS: ${e.message}` };
    }
};

export const deleteBucketCors = async (): Promise<{ success: boolean; message: string; }> => {
    try {
        const { s3Client, settings } = await getS3Client();
        await s3Client.send(new DeleteBucketCorsCommand({ Bucket: settings.s3BucketName! }));
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
