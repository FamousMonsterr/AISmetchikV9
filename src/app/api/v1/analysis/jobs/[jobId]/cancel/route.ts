import { NextRequest, NextResponse } from 'next/server';
import { requireV1BearerUser } from '@/lib/api-v1-auth';
import { appendJobLog, getServerAnalysisJob, updateJobStatus } from '@/server-functions/analysis/jobService';
import { failProcessingRequest } from '@/actions/userActions';

type Params = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;

  const { jobId } = await params;
  const job = await getServerAnalysisJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }
  if (job.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  await updateJobStatus(jobId, 'cancelled');
  await appendJobLog(jobId, 'Отменено пользователем (v1 API)', 'cancelled');
  if (job.projectId) {
    await failProcessingRequest({
      userId: auth.user.id,
      projectId: job.projectId,
      status: 'cancelled',
      error: 'Процесс остановлен пользователем',
    });
  }

  return NextResponse.json({ success: true });
}
