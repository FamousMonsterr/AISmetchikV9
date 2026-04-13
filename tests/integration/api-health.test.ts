import { describe, it, expect, vi } from 'vitest';

vi.mock('@/server-functions/monitoring/health', () => ({
  getServerHealth: vi.fn().mockResolvedValue({ ok: true }),
}));

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const response = await GET();
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});
