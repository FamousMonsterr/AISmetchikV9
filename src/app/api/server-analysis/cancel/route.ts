// src/app/api/server-analysis/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAnalysisJob, updateJobStatus, appendJobLog } from '@/server-functions/analysis/jobService';
import { failProcessingRequest } from '@/actions/userActions';

const CancelSchema = z.object({
  jobId: z.string().min(1),
  userId: z.string().min(1),
  projectId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const validation = CancelSchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json({ error: 'Неверные данные для отмены.' }, { status: 400 });
    }

    const { jobId, userId, projectId } = validation.data;
    const job = await getServerAnalysisJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Задача не найдена.' }, { status: 404 });
    }
    if (job.userId !== userId) {
      return NextResponse.json({ error: 'Нет доступа к задаче.' }, { status: 403 });
    }

    await updateJobStatus(jobId, 'cancelled');
    await appendJobLog(jobId, 'Отменено пользователем', 'cancelled');

    const projectToUpdate = projectId || job.projectId;
    if (projectToUpdate) {
      await failProcessingRequest({ userId, projectId: projectToUpdate, status: 'cancelled', error: 'Процесс остановлен пользователем' });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[server-analysis/cancel] error', error);
    return NextResponse.json({ error: 'Не удалось отменить задачу.' }, { status: 500 });
  }
}
