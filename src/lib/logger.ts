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
    | 'PROJECT_PROCESSING_START'
    | 'PROJECT_PROCESSING_COMPLETE'
    | 'PROJECT_PROCESSING_CANCELLED'
    | 'PROJECT_PROCESSING_FAILED'
    | 'PROJECT_PROCESSING_RESTART'
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
    | 'PRO_PAYMENT_SUBMITTED'
    | 'PRO_PAYMENT_APPROVED'
    | 'PRO_PAYMENT_AUTO_APPROVED'
    | 'PRO_PAYMENT_REJECTED'
    | 'CREDIT_PAYMENT_SUBMITTED'
    | 'CREDIT_PAYMENT_APPROVED'
    | 'CREDIT_PAYMENT_AUTO_APPROVED'
    | 'CREDIT_PAYMENT_REJECTED'
    | 'TEMPLATE_CREATED'
    | 'TEMPLATE_UPDATED'
    | 'TEMPLATE_DELETED'
    | 'MARKETING_CONSENT_UPDATE'
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

type ProjectEventStatus = 'debug' | 'info' | 'success' | 'warning' | 'error';

export type ProjectEventAction =
  | 'PROJECT_PROCESSING_START'
  | 'PROJECT_PROCESSING_STAGE'
  | 'PROJECT_PROCESSING_COMPLETE'
  | 'PROJECT_PROCESSING_FAILED'
  | 'PROJECT_PROCESSING_CANCELLED'
  | 'PROJECT_PROCESSING_RESTART'
  | 'PROJECT_JOB_CREATED'
  | 'PROJECT_JOB_STATUS'
  | 'PROJECT_JOB_LINKED'
  | 'PROJECT_NOTIFICATION'
  | 'PROJECT_AI_CALL'
  | 'PROJECT_CACHE';

interface ProjectEventLogInput {
  projectId: string;
  userId?: string;
  jobId?: string;
  action: ProjectEventAction;
  stage?: string;
  status?: ProjectEventStatus;
  message?: string;
  source?: 'client' | 'server' | 'worker' | 'api';
  model?: string;
  tags?: string[];
  file?: {
    name?: string | null;
    uri?: string | null;
    sha1?: string | null;
    objectKey?: string | null;
  };
  metadata?: Record<string, any>;
  request?: any;
  response?: any;
  error?: unknown;
  durationMs?: number;
  correlationId?: string;
}

const MAX_EVENT_JSON_CHARS = 200_000;

const sanitizeLogPayload = (value: unknown, maxChars: number = MAX_EVENT_JSON_CHARS) => safeJsonPayload(value, maxChars);

const serializeError = (error: unknown) => {
  if (!error) return null;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ? truncateString(error.stack, MAX_LOG_STRING_CHARS) : undefined,
      cause: error.cause ? sanitizeLogPayload(error.cause) : undefined,
    };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  return sanitizeLogPayload(error);
};

export const logProjectEvent = async (input: ProjectEventLogInput) => {
  const {
    projectId,
    userId,
    jobId,
    action,
    stage,
    status = 'info',
    message,
    source = 'server',
    model,
    tags,
    file,
    metadata,
    request,
    response,
    error,
    durationMs,
    correlationId,
  } = input;

  try {
    await addDoc(collection(db, 'project_event_logs'), {
      projectId,
      userId: userId || null,
      jobId: jobId || null,
      action,
      stage: stage || null,
      status,
      message: message || null,
      source,
      model: model || null,
      tags: Array.isArray(tags) ? tags.slice(0, 20).map((t) => String(t).slice(0, 120)) : [],
      file: file
        ? {
            name: file.name || null,
            uri: file.uri || null,
            sha1: file.sha1 || null,
            objectKey: file.objectKey || null,
          }
        : null,
      metadata: sanitizeLogPayload(metadata),
      request: sanitizeLogPayload(request, MAX_EVENT_JSON_CHARS),
      response: sanitizeLogPayload(response, MAX_EVENT_JSON_CHARS),
      error: serializeError(error),
      durationMs: typeof durationMs === 'number' ? durationMs : null,
      correlationId: correlationId || jobId || projectId,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('Error logging project event:', err, { projectId, action, stage });
  }
};
