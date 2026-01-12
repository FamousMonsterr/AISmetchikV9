// src/lib/logger.ts
import { collection, addDoc, serverTimestamp } from '@/lib/mongoFirestoreServer';
import { db } from '@/lib/firebase';

export type ActionType = 
    | 'USER_LOGIN'
    | 'PROFILE_UPDATE'
    | 'PROJECT_DRAFT_CREATE'
    | 'PROJECT_DRAFT_UPDATE'
    | 'PROJECT_VERSION_PROMOTE'
    | 'PROJECT_REPORT'
    | 'PROJECT_ARCHIVE'
    | 'PROJECT_UNARCHIVE'
    | 'PROJECT_DELETE'
    | 'PROJECT_GROUP_INTO_OBJECT'
    | 'PROJECT_UNGROUP_FROM_OBJECT'
    | 'PRICE_BASE_TOGGLE_PROJECT'
    | 'PRICE_BASE_IMPORT'
    | 'PRICE_BASE_ITEM_UPDATE'
    | 'CREDIT_DEDUCTION'
    | 'CREDIT_REFUND'
    | 'ADMIN_UPDATE_USER'
    | 'ADMIN_ADD_CREDITS'
    | 'ADMIN_SET_USER_STATUS'
    | 'ADMIN_ARCHIVE_USER'
    | 'ADMIN_RESOLVE_TICKET'
    | 'ADMIN_UPDATE_SETTINGS'
    | 'ADMIN_UPDATE_PROMPTS'
    | 'ADMIN_UPDATE_SECTIONS'
    | 'ADMIN_UPDATE_LEGAL_ENTITY'
    | 'ADMIN_UPDATE_AI_CONFIG'
    | 'ADMIN_UPDATE_ENV_SETTINGS'
    | 'ADMIN_WIPE_ALL_DATA'
    | 'ADMIN_SEND_TELEGRAM_MESSAGE'
    | 'TRIAL_ACTIVATED'
    | 'PARTNER_TERMS_AGREED'
    | 'USER_CONSENT_THIRD_PARTY'
    | 'AI_ACCURACY_FEEDBACK'
    | 'ITEM_ADDED'
    | 'ITEM_DELETED'
    | 'ITEM_MODIFIED'
    | 'BATCH_PRICE_UPDATE';

export const logUserAction = async (userId: string, action: ActionType, details: Record<string, any> = {}) => {
  try {
    await addDoc(collection(db, 'user_logs'), {
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging user action:", error);
  }
};

interface AiApiLogParams {
    userId: string;
    model: string;
    provider: 'openrouter';
    status: 'success' | 'error';
    errorMessage?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    totalCost?: number; // Cost in USD
    details?: {
      rawPrompt?: string; // Add this to store the full prompt
      [key: string]: any;
    };
    rawResponse?: any; // Add this to store the full raw response
    promptVersion?: number; // New field for versioning
}

const MAX_LOG_JSON_CHARS = 500_000;
const MAX_LOG_STRING_CHARS = 20_000;

const truncateString = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...[truncated ${value.length - maxLength} chars]`;
};

const safeJsonPayload = (value: unknown, maxChars: number) => {
  if (value == null) return null;
  try {
    const json = JSON.stringify(value);
    if (json.length <= maxChars) return value;
    return {
      truncated: true,
      originalLength: json.length,
      preview: json.slice(0, maxChars),
    };
  } catch (error) {
    return {
      truncated: true,
      reason: 'unserializable',
    };
  }
};

const sanitizeDetails = (details?: AiApiLogParams['details']) => {
  if (!details) return {};
  const safeDetails = { ...details };
  if (typeof safeDetails.rawPrompt === 'string') {
    safeDetails.rawPrompt = truncateString(safeDetails.rawPrompt, MAX_LOG_STRING_CHARS);
  }
  return safeJsonPayload(safeDetails, MAX_LOG_JSON_CHARS);
};

export const logAiApiCall = async ({ userId, model, provider, status, errorMessage, promptTokens, completionTokens, totalTokens, totalCost, details, rawResponse, promptVersion }: AiApiLogParams) => {
    try {
        const safeDetails = sanitizeDetails(details);
        const safeRawResponse = safeJsonPayload(rawResponse, MAX_LOG_JSON_CHARS);
        await addDoc(collection(db, 'ai_api_logs'), {
            userId,
            model,
            provider,
            status,
            errorMessage: errorMessage || null,
            promptTokens: promptTokens || 0,
            completionTokens: completionTokens || 0,
            totalTokens: totalTokens || 0,
            totalCost: totalCost || 0,
            details: safeDetails || {},
            rawResponse: safeRawResponse,
            promptVersion: promptVersion || null,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error logging AI API call:", error);
    }
};
