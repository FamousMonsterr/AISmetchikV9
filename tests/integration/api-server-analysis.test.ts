import { describe, it, expect, vi, beforeEach } from 'vitest';

const getDocMock = vi.fn();
const getCreditSummaryMock = vi.fn();
const createJobMock = vi.fn();
const getAppSettingsMock = vi.fn();
const getAiAgentConfigMock = vi.fn();

vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/actions/adminActions', () => ({
  getAppSettings: (...args: any[]) => getAppSettingsMock(...args),
  getAiAgentConfig: (...args: any[]) => getAiAgentConfigMock(...args),
}));
vi.mock('@/lib/db-server', () => ({
  doc: vi.fn((_db: any, _collection: string, id: string) => ({ id })),
  getDoc: (...args: any[]) => getDocMock(...args),
}));
vi.mock('@/server-functions/analysis/jobService', () => ({
  createServerAnalysisJob: (...args: any[]) => createJobMock(...args),
}));
vi.mock('@/services/credits', () => ({
  getCreditSummary: (...args: any[]) => getCreditSummaryMock(...args),
}));
vi.mock('@/lib/logger', () => ({
  logProjectEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/api-auth', () => ({
  requireAuthenticatedUser: vi.fn().mockResolvedValue({
    ok: true,
    user: { id: 'user-1', role: 'User', plan: 'PRO' },
  }),
  validateRequestedUserId: vi.fn(() => ({ ok: true })),
}));
vi.mock('@/lib/rate-limit', () => ({
  enforceRateLimit: vi.fn(() => null),
}));
vi.mock('@/lib/file-uri-security', () => ({
  validateFileUriAgainstAllowlist: vi.fn().mockResolvedValue({ ok: true }),
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
    getAppSettingsMock.mockReset();
    getAiAgentConfigMock.mockReset();
    getAppSettingsMock.mockResolvedValue({
      serverFunctionsEnabled: true,
      serverFunctionsMode: 'server',
      serverFunctionsPaidOnly: false,
      serverFunctionsAllowedPlans: ['Free', 'PRO', 'Business', 'Enterprise'],
      analysisPipelineVersion: 'v1',
      aiExecutionProvider: 'openrouter',
    });
    getAiAgentConfigMock.mockResolvedValue({
      apiModels: [
        { value: 'test-model', isDefault: true },
        { value: 'service-model', isServiceModel: true },
      ],
      planModels: {
        free: { defaultModel: 'test-model', availableModels: ['test-model'], abTestModels: ['test-model'] },
        pro: { defaultModel: 'test-model', availableModels: ['test-model'], abTestModels: ['test-model'] },
        business: { defaultModel: 'test-model', availableModels: ['test-model'] },
        enterprise: { defaultModel: 'test-model', availableModels: ['test-model'] },
      },
    });
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

    const response = await POST(new Request('http://localhost/api/server-analysis', {
      method: 'POST',
      body: JSON.stringify(basePayload),
    }) as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.jobId).toBe('job-1');
    expect(createJobMock).toHaveBeenCalledWith(expect.objectContaining({
      pipelineVersion: 'v1',
      executionProvider: 'openrouter',
    }));
  });

  it('uses local_hf provider only for v2 jobs', async () => {
    getAppSettingsMock.mockResolvedValue({
      serverFunctionsEnabled: true,
      serverFunctionsMode: 'server',
      serverFunctionsPaidOnly: false,
      serverFunctionsAllowedPlans: ['Free', 'PRO', 'Business', 'Enterprise'],
      analysisPipelineVersion: 'v2',
      aiExecutionProvider: 'local_hf',
    });
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ plan: 'PRO' }) });
    getCreditSummaryMock.mockResolvedValue({ total: 10 });
    createJobMock.mockResolvedValue({ id: 'job-v2', status: 'queued' });

    const response = await POST(new Request('http://localhost/api/server-analysis', {
      method: 'POST',
      body: JSON.stringify(basePayload),
    }) as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.jobId).toBe('job-v2');
    expect(createJobMock).toHaveBeenCalledWith(expect.objectContaining({
      pipelineVersion: 'v2',
      executionProvider: 'local_hf',
    }));
  });
});
