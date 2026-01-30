// src/server-functions/analysis/worker.ts
'use server';

import { findQueuedJobs } from './jobService';
import { runServerAnalysisJob } from './jobRunner';

export type WorkerRunResult = {
  processed: number;
  jobIds: string[];
  errors: Array<{ jobId: string; message: string }>;
};

export async function runServerAnalysisWorkerOnce(limitCount = 5): Promise<WorkerRunResult> {
  const jobs = await findQueuedJobs(limitCount);
  if (!jobs.length) {
    return { processed: 0, jobIds: [], errors: [] };
  }

  const errors: WorkerRunResult['errors'] = [];
  const jobIds: string[] = [];
  for (const job of jobs) {
    jobIds.push(job.id);
    try {
      await runServerAnalysisJob(job.id);
    } catch (error: any) {
      errors.push({ jobId: job.id, message: error?.message || 'Worker job failed' });
    }
  }

  return { processed: jobIds.length, jobIds, errors };
}
