// src/server-functions/analysis/jobService.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc, arrayUnion, query, where, orderBy, limit as limitClause, getDocs } from '@/lib/mongoFirestoreServer';
import { getDb } from '@/lib/mongodb';
import { SERVER_ANALYSIS_COLLECTION } from '../config';
import type { CreateServerAnalysisJobInput, ServerAnalysisJob, ServerAnalysisJobStatus } from './types';
import type { UserPlan } from '@/contexts/AppContext';

const TERMINAL_JOB_STATUSES: ServerAnalysisJobStatus[] = ['succeeded', 'failed', 'cancelled'];
const PLAN_WEIGHTS: Record<UserPlan, number> = {
  Enterprise: 27,
  Business: 9,
  PRO: 3,
  Free: 1,
};
const PLAN_WHEEL: UserPlan[] = Object.entries(PLAN_WEIGHTS).flatMap(([plan, weight]) =>
  Array.from({ length: weight }, () => plan as UserPlan)
);

let planWheelCursor = 0;

function normalizePlan(plan: unknown): UserPlan {
  if (plan === 'Enterprise' || plan === 'Business' || plan === 'PRO' || plan === 'Free') {
    return plan;
  }
  return 'Free';
}

function getStatusClaimOrder(queuedJobs: ServerAnalysisJob[]): string[] {
  const jobsByPlan = new Map<UserPlan, ServerAnalysisJob[]>();
  queuedJobs.forEach((job) => {
    const plan = normalizePlan(job.userPlan);
    const list = jobsByPlan.get(plan) || [];
    list.push(job);
    jobsByPlan.set(plan, list);
  });

  for (const plan of jobsByPlan.keys()) {
    const sorted = (jobsByPlan.get(plan) || []).sort((a, b) => {
      const aTs = new Date(a.createdAt as any).getTime();
      const bTs = new Date(b.createdAt as any).getTime();
      return aTs - bTs;
    });
    jobsByPlan.set(plan, sorted);
  }

  const jobIds: string[] = [];
  for (let i = 0; i < PLAN_WHEEL.length; i += 1) {
    const idx = (planWheelCursor + i) % PLAN_WHEEL.length;
    const plan = PLAN_WHEEL[idx];
    const planQueue = jobsByPlan.get(plan);
    if (!planQueue?.length) continue;
    const nextJob = planQueue.shift();
    if (!nextJob) continue;
    jobIds.push(nextJob.id);
    planWheelCursor = (idx + 1) % PLAN_WHEEL.length;
  }

  for (const job of queuedJobs) {
    if (!jobIds.includes(job.id)) {
      jobIds.push(job.id);
    }
  }

  return jobIds;
}

export async function createServerAnalysisJob(input: CreateServerAnalysisJobInput): Promise<ServerAnalysisJob> {
  if (input.idempotencyKey) {
    const dbClient = await getDb();
    const existing = await dbClient.collection(SERVER_ANALYSIS_COLLECTION).findOne({
      idempotencyKey: input.idempotencyKey,
      status: { $in: ['queued', 'running'] },
    });
    if (existing) {
      const { _id, ...rest } = existing as any;
      return { id: String(_id), ...rest } as ServerAnalysisJob;
    }
  }

  const collectionRef = collection(db, SERVER_ANALYSIS_COLLECTION);
  const jobRef = doc(collectionRef);

  const jobData: Omit<ServerAnalysisJob, 'id'> = {
    userId: input.userId,
    projectId: input.projectId,
    fileUri: input.fileUri,
    fileSha1: input.fileSha1,
    fileName: input.fileName,
    mimeType: input.mimeType,
    objectKey: input.objectKey,
    model: input.model,
    pipelineVersion: input.pipelineVersion || 'v1',
    executionProvider: input.executionProvider || 'openrouter',
    userPlan: normalizePlan(input.userPlan),
    idempotencyKey: input.idempotencyKey,
    temperature: input.temperature,
    includeThoughts: input.includeThoughts,
    creditCost: input.creditCost,
    claimedBy: null,
    claimedAt: null,
    startedAt: null,
    finishedAt: null,
    attempt: 0,
    status: 'queued',
    error: null,
    resultRequestId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    logs: [
      { timestamp: serverTimestamp(), message: 'Задача создана и поставлена в очередь', stage: 'queued' },
      { timestamp: serverTimestamp(), message: `Стоимость анализа: ${input.creditCost} кредит(ов)`, stage: 'queued' },
    ],
  };

  await setDoc(jobRef, jobData as any);
  return { id: jobRef.id, ...jobData };
}

export async function getServerAnalysisJob(jobId: string): Promise<ServerAnalysisJob | null> {
  const jobRef = doc(db, SERVER_ANALYSIS_COLLECTION, jobId);
  const snap = await getDoc(jobRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ServerAnalysisJob;
}

export async function appendJobLog(jobId: string, message: string, stage?: string) {
  const jobRef = doc(db, SERVER_ANALYSIS_COLLECTION, jobId);
  await updateDoc(jobRef, {
    updatedAt: serverTimestamp(),
    logs: arrayUnion({ timestamp: serverTimestamp(), message, stage }),
  } as any);
}

export async function updateJobStatus(
  jobId: string,
  status: ServerAnalysisJobStatus,
  extra: Partial<ServerAnalysisJob> = {}
) {
  const jobRef = doc(db, SERVER_ANALYSIS_COLLECTION, jobId);
  const updatePayload: Record<string, any> = {
    status,
    updatedAt: serverTimestamp(),
    ...extra,
  };
  if (status === 'running') {
    updatePayload.startedAt = extra.startedAt || serverTimestamp();
  }
  if (TERMINAL_JOB_STATUSES.includes(status)) {
    updatePayload.finishedAt = extra.finishedAt || serverTimestamp();
  }
  await updateDoc(jobRef, {
    ...updatePayload,
  } as any);
}

export async function findQueuedJobs(limitCount = 5): Promise<ServerAnalysisJob[]> {
  const jobsRef = collection(db, SERVER_ANALYSIS_COLLECTION);
  const q = query(jobsRef, where('status', '==', 'queued'), orderBy('createdAt', 'asc'), limitClause(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServerAnalysisJob));
}

export async function claimNextQueuedJob(workerId: string): Promise<ServerAnalysisJob | null> {
  const dbClient = await getDb();
  const queued = await dbClient
    .collection(SERVER_ANALYSIS_COLLECTION)
    .find({ status: 'queued' })
    .sort({ createdAt: 1 })
    .limit(200)
    .toArray();

  if (!queued.length) return null;

  const queuedJobs = queued.map((row: any) => ({ id: String(row._id), ...row } as ServerAnalysisJob));
  const claimOrder = getStatusClaimOrder(queuedJobs);

  for (const jobId of claimOrder) {
    const now = new Date();
    const result = await dbClient.collection(SERVER_ANALYSIS_COLLECTION).findOneAndUpdate(
      { _id: jobId as any, status: 'queued' },
      {
        $set: {
          status: 'running',
          claimedBy: workerId,
          claimedAt: now,
          startedAt: now,
          updatedAt: now,
        },
        $inc: { attempt: 1 },
      },
      { returnDocument: 'after' }
    );

    const claimed = (result as any)?.value || result;
    if (!claimed?._id) continue;
    const { _id, ...rest } = claimed as any;
    return { id: String(_id), ...rest } as ServerAnalysisJob;
  }

  return null;
}
