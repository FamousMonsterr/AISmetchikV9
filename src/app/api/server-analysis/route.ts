// src/app/api/server-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { getAppSettings } from '@/actions/adminActions';
import { db } from '@/lib/db';
import { doc, getDoc } from '@/lib/db-server';
import { createServerAnalysisJob } from '@/server-functions/analysis/jobService';
import { SERVER_ANALYSIS_CREDIT_COST } from '@/server-functions/config';
import { logProjectEvent } from '@/lib/logger';
import { getCreditSummary } from '@/services/credits';
import { requireAuthenticatedUser, validateRequestedUserId } from '@/lib/api-auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateFileUriAgainstAllowlist } from '@/lib/file-uri-security';
import { queueApiMetricLog } from '@/lib/api-metrics';

const RequestSchema = z.object({
  userId: z.string().min(1).optional(),
  projectId: z.string().min(1),
  fileUri: z.string().url(),
  fileSha1: z.string().min(5),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  objectKey: z.string().optional(),
  model: z.string().min(1),
  temperature: z.number().optional(),
  includeThoughts: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth.response;

    const rateLimitResponse = enforceRateLimit({
      request,
      scope: 'api:server-analysis:create',
      userId: auth.user.id,
      max: 8,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const json = await request.json();
    const validation = RequestSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json({ error: 'Некорректные данные запроса.' }, { status: 400 });
    }
    const payload = validation.data;
    const userValidation = validateRequestedUserId(payload.userId, auth.user.id);
    if (!userValidation.ok) return userValidation.response;

    const fileUriValidation = await validateFileUriAgainstAllowlist(payload.fileUri);
    if (!fileUriValidation.ok) {
      return NextResponse.json({
        error: fileUriValidation.reason || 'Недопустимый fileUri.',
        host: fileUriValidation.host,
      }, { status: 400 });
    }

    const appSettings = await getAppSettings();
    if (!appSettings.serverFunctionsEnabled || appSettings.serverFunctionsMode !== 'server') {
      return NextResponse.json({ error: 'Серверные функции отключены в настройках.' }, { status: 403 });
    }

    const userRef = doc(db, 'users', auth.user.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'Пользователь не найден.' }, { status: 404 });
    }
    const userData = userSnap.data() as any;
    const plan = userData.plan || 'Free';
    const allowedPlans = (appSettings.serverFunctionsAllowedPlans?.length ? appSettings.serverFunctionsAllowedPlans : undefined)
      ?? (appSettings.serverFunctionsPaidOnly ? ['PRO', 'Business', 'Enterprise'] : ['Free', 'PRO', 'Business', 'Enterprise']);
    if (!allowedPlans.includes(plan)) {
      return NextResponse.json({ error: 'Серверная обработка недоступна для текущего тарифа.' }, { status: 403 });
    }

    const creditSummary = await getCreditSummary(auth.user.id, { refresh: true });
    if (creditSummary.total < SERVER_ANALYSIS_CREDIT_COST) {
      return NextResponse.json({ error: 'Недостаточно кредитов для запуска серверного анализа.' }, { status: 402 });
    }

    const pipelineVersion = appSettings.analysisPipelineVersion || 'v1';
    const executionProvider = pipelineVersion === 'v1'
      ? 'openrouter'
      : (appSettings.aiExecutionProvider || 'openrouter');

    const idempotencyKey = createHash('sha256')
      .update(`${auth.user.id}:${payload.projectId}:${payload.fileSha1}:${pipelineVersion}`)
      .digest('hex');

    const job = await createServerAnalysisJob({
      ...payload,
      userId: auth.user.id,
      pipelineVersion,
      executionProvider,
      userPlan: plan,
      idempotencyKey,
      creditCost: SERVER_ANALYSIS_CREDIT_COST,
    });

    await logProjectEvent({
      projectId: payload.projectId,
      userId: auth.user.id,
      jobId: job.id,
      action: 'PROJECT_JOB_CREATED',
      stage: 'queued',
      status: 'info',
      source: 'api',
      model: payload.model,
      file: {
        name: payload.fileName,
        uri: payload.fileUri,
        sha1: payload.fileSha1,
        objectKey: payload.objectKey || null,
      },
      metadata: {
        temperature: payload.temperature ?? null,
        includeThoughts: payload.includeThoughts ?? false,
        creditCost: SERVER_ANALYSIS_CREDIT_COST,
        pipelineVersion,
        executionProvider,
      },
      message: 'Создана серверная задача на анализ файла',
    });

    const responsePayload = { success: true, jobId: job.id, status: job.status, enqueued: true };
    queueApiMetricLog({
      ts: new Date().toISOString(),
      endpoint: '/api/server-analysis',
      userId: auth.user.id,
      status: 200,
      durationMs: Date.now() - startedAt,
      pipelineVersion,
      executionProvider,
      queueStatus: job.status,
    });
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('[server-analysis] error', error);
    queueApiMetricLog({
      ts: new Date().toISOString(),
      endpoint: '/api/server-analysis',
      status: 500,
      durationMs: Date.now() - startedAt,
      error: error?.message || 'unknown',
    });
    return NextResponse.json({ error: 'Внутренняя ошибка сервера при создании задачи.' }, { status: 500 });
  }
}
