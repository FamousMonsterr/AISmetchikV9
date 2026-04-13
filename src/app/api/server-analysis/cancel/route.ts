// src/app/api/server-analysis/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAnalysisJob, updateJobStatus, appendJobLog } from '@/server-functions/analysis/jobService';
import { failProcessingRequest } from '@/actions/userActions';
import { requireAuthenticatedUser, validateRequestedUserId } from '@/lib/api-auth';
import { enforceRateLimit } from '@/lib/rate-limit';

const CancelSchema = z.object({
  jobId: z.string().min(1),
  userId: z.string().min(1).optional(),
  projectId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth.response;

    const rateLimitResponse = enforceRateLimit({
      request,
      scope: 'api:server-analysis:cancel',
      userId: auth.user.id,
      max: 20,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const payload = await request.json();
    const validation = CancelSchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json({ error: 'Неверные данные для отмены.' }, { status: 400 });
    }

    const { jobId, userId, projectId } = validation.data;
    const userValidation = validateRequestedUserId(userId, auth.user.id);
    if (!userValidation.ok) return userValidation.response;

    const job = await getServerAnalysisJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Задача не найдена.' }, { status: 404 });
    }
    if (job.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Нет доступа к задаче.' }, { status: 403 });
    }

    await updateJobStatus(jobId, 'cancelled');
    await appendJobLog(jobId, 'Отменено пользователем', 'cancelled');

    const projectToUpdate = projectId || job.projectId;
    if (projectToUpdate) {
      await failProcessingRequest({ userId: auth.user.id, projectId: projectToUpdate, status: 'cancelled', error: 'Процесс остановлен пользователем' });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[server-analysis/cancel] error', error);
    return NextResponse.json({ error: 'Не удалось отменить задачу.' }, { status: 500 });
  }
}
