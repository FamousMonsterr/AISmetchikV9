import { describe, it, expect, vi, beforeEach } from 'vitest';

const getDocMock = vi.fn();
const getCreditSummaryMock = vi.fn();
const createJobMock = vi.fn();
const runJobMock = vi.fn();

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/actions/adminActions', () => ({
  getAppSettings: vi.fn().mockResolvedValue({
    serverFunctionsEnabled: true,
    serverFunctionsMode: 'server',
    serverFunctionsPaidOnly: false,
    serverFunctionsAllowedPlans: ['Free', 'PRO', 'Business', 'Enterprise'],
  }),
}));
vi.mock('@/lib/mongoFirestoreServer', () => ({
  doc: vi.fn((_db: any, _collection: string, id: string) => ({ id })),
  getDoc: (...args: any[]) => getDocMock(...args),
}));
vi.mock('@/server-functions/analysis/jobService', () => ({
  createServerAnalysisJob: (...args: any[]) => createJobMock(...args),
}));
vi.mock('@/server-functions/analysis/jobRunner', () => ({
  runServerAnalysisJob: (...args: any[]) => runJobMock(...args),
}));
vi.mock('@/services/credits', () => ({
  getCreditSummary: (...args: any[]) => getCreditSummaryMock(...args),
}));
vi.mock('@/lib/logger', () => ({
  logProjectEvent: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/server-analysis/route';

const basePayload = {
  userId: 'user-1',
  projectId: 'project-1',
  fileUri: 'https://example.com/file.pdf',
  fileSha1: 'abc123',
  fileName: 'file.pdf',
  mimeType: 'application/pdf',
  model: 'test-model',
};

describe('POST /api/server-analysis', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    getCreditSummaryMock.mockReset();
    createJobMock.mockReset();
    runJobMock.mockReset();
  });

  it('returns insufficient credits when balance is low', async () => {
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ plan: 'PRO' }) });
    getCreditSummaryMock.mockResolvedValue({ total: 0 });

    const response = await POST(new Request('http://localhost/api/server-analysis', {
      method: 'POST',
      body: JSON.stringify(basePayload),
    }) as any);
    const json = await response.json();

    expect(response.status).toBe(402);
    expect(json.error).toContain('Недостаточно кредитов');
  });

  it('creates a job when credits are достаточны', async () => {
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ plan: 'PRO' }) });
    getCreditSummaryMock.mockResolvedValue({ total: 10 });
    createJobMock.mockResolvedValue({ id: 'job-1', status: 'queued' });
    runJobMock.mockResolvedValue(undefined);

    const response = await POST(new Request('http://localhost/api/server-analysis', {
      method: 'POST',
      body: JSON.stringify(basePayload),
    }) as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.jobId).toBe('job-1');
  });
});
