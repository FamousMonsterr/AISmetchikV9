// src/server-functions/analysis/types.ts
import type { Timestamp } from '@/lib/mongoFirestoreServer';

export type ServerAnalysisJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface ServerAnalysisJob {
  id: string;
  userId: string;
  projectId: string;
  fileUri: string;
  fileSha1: string;
  fileName: string;
  mimeType: string;
  objectKey?: string;
  model: string;
  temperature?: number;
  includeThoughts?: boolean;
  creditCost: number;
  status: ServerAnalysisJobStatus;
  error?: string | null;
  resultRequestId?: string | null;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  logs?: Array<{ timestamp: Date | Timestamp; message: string; stage?: string }>;
}

export interface CreateServerAnalysisJobInput {
  userId: string;
  projectId: string;
  fileUri: string;
  fileSha1: string;
  fileName: string;
  mimeType: string;
  objectKey?: string;
  model: string;
  temperature?: number;
  includeThoughts?: boolean;
  creditCost: number;
}
