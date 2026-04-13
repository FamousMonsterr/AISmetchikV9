// src/server-functions/analysis/worker.ts
'use server';

import { claimNextQueuedJob } from './jobService';
import { runServerAnalysisJob } from './jobRunner';

export type WorkerRunResult = {
  processed: number;
  jobIds: string[];
  errors: Array<{ jobId: string; message: string }>;
};

export async function runServerAnalysisWorkerOnce(limitCount = 5): Promise<WorkerRunResult> {
  const errors: WorkerRunResult['errors'] = [];
  const jobIds: string[] = [];
  const workerId = process.env.WORKER_ID || `pid:${process.pid}`;

  for (let i = 0; i < limitCount; i += 1) {
    const claimedJob = await claimNextQueuedJob(workerId);
    if (!claimedJob) break;
    jobIds.push(claimedJob.id);
    try {
      await runServerAnalysisJob(claimedJob.id, { alreadyClaimed: true });
    } catch (error: any) {
      errors.push({ jobId: claimedJob.id, message: error?.message || 'Worker job failed' });
    }
  }

  if (!jobIds.length) {
    return { processed: 0, jobIds: [], errors: [] };
  }

  return { processed: jobIds.length, jobIds, errors };
}
