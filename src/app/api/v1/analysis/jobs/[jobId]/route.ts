import { NextRequest, NextResponse } from 'next/server';
import { requireV1BearerUser } from '@/lib/api-v1-auth';
import { getServerAnalysisJob } from '@/server-functions/analysis/jobService';
import { sanitizeAnalysisErrorForUi } from '@/lib/analysis-errors';

type Params = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireV1BearerUser(request);
  if (!auth.ok) return auth.response;

  const { jobId } = await params;
  const job = await getServerAnalysisJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }
  if (job.userId !== auth.user.id && auth.user.role !== 'Admin' && auth.user.role !== 'Super Admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    projectId: job.projectId,
    pipelineVersion: job.pipelineVersion || 'v1',
    executionProvider: job.executionProvider || 'openrouter',
    processingStage: job.status,
    error: job.error ? sanitizeAnalysisErrorForUi(job.error) : null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt || null,
    finishedAt: job.finishedAt || null,
    logs: (job.logs || []).slice(-25),
  });
}
