import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { getAppSettings } from '@/actions/adminActions';
import { db } from '@/lib/firebase';
import { doc, getDoc } from '@/lib/mongoFirestoreServer';
import { createServerAnalysisJob } from '@/server-functions/analysis/jobService';
import { SERVER_ANALYSIS_CREDIT_COST } from '@/server-functions/config';
import { getCreditSummary } from '@/services/credits';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateFileUriAgainstAllowlist } from '@/lib/file-uri-security';
import { requireV1BearerUser } from '@/lib/api-v1-auth';

const RequestSchema = z.object({
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
  try {
    const auth = await requireV1BearerUser(request);
    if (!auth.ok) return auth.response;

    const rateLimitResponse = enforceRateLimit({
      request,
      scope: 'api:v1:analysis:jobs:create',
      userId: auth.user.id,
      max: 8,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const payloadRaw = await request.json();
    const validation = RequestSchema.safeParse(payloadRaw);
    if (!validation.success) {
      return NextResponse.json({ error: 'Некорректные данные запроса.' }, { status: 400 });
    }
    const payload = validation.data;

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
    const plan = userData.plan || auth.user.plan || 'Free';
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

    return NextResponse.json({ success: true, jobId: job.id, status: job.status, enqueued: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Внутренняя ошибка сервера.' }, { status: 500 });
  }
}
