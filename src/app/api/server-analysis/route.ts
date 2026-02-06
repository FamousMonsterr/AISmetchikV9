// src/app/api/server-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAppSettings } from '@/actions/adminActions';
import { db } from '@/lib/firebase';
import { doc, getDoc } from '@/lib/mongoFirestoreServer';
import { createServerAnalysisJob } from '@/server-functions/analysis/jobService';
import { runServerAnalysisJob } from '@/server-functions/analysis/jobRunner';
import { SERVER_ANALYSIS_CREDIT_COST } from '@/server-functions/config';
import { logProjectEvent } from '@/lib/logger';
import { getCreditSummary } from '@/services/credits';

const RequestSchema = z.object({
  userId: z.string().min(1),
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
    const json = await request.json();
    const validation = RequestSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json({ error: 'Некорректные данные запроса.' }, { status: 400 });
    }
    const payload = validation.data;

    const appSettings = await getAppSettings();
    if (!appSettings.serverFunctionsEnabled || appSettings.serverFunctionsMode !== 'server') {
      return NextResponse.json({ error: 'Серверные функции отключены в настройках.' }, { status: 403 });
    }

    const userRef = doc(db, 'users', payload.userId);
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

    const creditSummary = await getCreditSummary(payload.userId, { refresh: true });
    if (creditSummary.total < SERVER_ANALYSIS_CREDIT_COST) {
      return NextResponse.json({ error: 'Недостаточно кредитов для запуска серверного анализа.' }, { status: 402 });
    }

    const job = await createServerAnalysisJob({
      ...payload,
      projectId: payload.projectId,
      creditCost: SERVER_ANALYSIS_CREDIT_COST,
    });

    await logProjectEvent({
      projectId: payload.projectId,
      userId: payload.userId,
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
      },
      message: 'Создана серверная задача на анализ файла',
    });

    // Fire and forget: run job in background
    runServerAnalysisJob(job.id).catch((err) => {
      console.error('[server-analysis] background execution failed', err);
    });

    return NextResponse.json({ success: true, jobId: job.id, status: job.status });
  } catch (error: any) {
    console.error('[server-analysis] error', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера при создании задачи.' }, { status: 500 });
  }
}
