// src/server-functions/analysis/jobService.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc, arrayUnion, query, where, orderBy, limit as limitClause, getDocs } from '@/lib/mongoFirestoreServer';
import { SERVER_ANALYSIS_COLLECTION } from '../config';
import type { CreateServerAnalysisJobInput, ServerAnalysisJob, ServerAnalysisJobStatus } from './types';

export async function createServerAnalysisJob(input: CreateServerAnalysisJobInput): Promise<ServerAnalysisJob> {
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
    temperature: input.temperature,
    includeThoughts: input.includeThoughts,
    creditCost: input.creditCost,
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
  await updateDoc(jobRef, {
    status,
    updatedAt: serverTimestamp(),
    ...extra,
  } as any);
}

export async function findQueuedJobs(limitCount = 5): Promise<ServerAnalysisJob[]> {
  const jobsRef = collection(db, SERVER_ANALYSIS_COLLECTION);
  const q = query(jobsRef, where('status', '==', 'queued'), orderBy('createdAt', 'asc'), limitClause(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServerAnalysisJob));
}
