'use server';

// src/server-functions/admin/actions.ts
import { db } from '@/lib/db';
import { collection, getDocs, limit, orderBy, query, where, updateDoc } from '@/lib/db-server';
import type { ServerAnalysisJob } from '../analysis/types';
import { getServerAnalysisJob } from '../analysis/jobService';
import { runServerAnalysisWorkerOnce } from '../analysis/worker';

export async function listServerAnalysisJobs(limitCount = 50): Promise<ServerAnalysisJob[]> {
  const jobsRef = collection(db, 'server_analysis_jobs');
  const jobsQuery = query(jobsRef, orderBy('createdAt', 'desc'), limit(limitCount));
  const snapshot = await getDocs(jobsQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ServerAnalysisJob));
}

export async function getServerJob(jobId: string): Promise<ServerAnalysisJob | null> {
  return await getServerAnalysisJob(jobId);
}

export async function getServerJobLogs(jobId: string): Promise<any[] | null> {
  const job = await getServerAnalysisJob(jobId);
  if (!job) return null;
  return job.logs || [];
}

export async function runServerWorkerOnce(limitCount = 3): Promise<{ success: boolean; message: string }> {
  const result = await runServerAnalysisWorkerOnce(limitCount);
  if (!result.processed) return { success: true, message: 'Очередь пуста.' };
  const message = result.errors.length
    ? `Обработано задач: ${result.processed} (ошибок: ${result.errors.length})`
    : `Обработано задач: ${result.processed}`;
  return { success: true, message };
}

export async function requeueFailedJobs(limitCount = 20): Promise<{ success: boolean; message: string; count: number }> {
  const jobsRef = collection(db, 'server_analysis_jobs');
  const jobsQuery = query(jobsRef, where('status', 'in', ['failed', 'cancelled']), orderBy('updatedAt', 'desc'), limit(limitCount));
  const snapshot = await getDocs(jobsQuery);
  let count = 0;
  for (const docSnap of snapshot.docs) {
    await updateDoc(docSnap.ref as any, { status: 'queued' });
    count++;
  }
  return { success: true, message: `Переведено в очередь: ${count}`, count };
}
