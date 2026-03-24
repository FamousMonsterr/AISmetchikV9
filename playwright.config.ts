import { defineConfig } from '@playwright/test';

function normalizeBaseUrl(rawValue: string | undefined) {
  const value = rawValue?.trim();
  if (!value) {
    return 'http://localhost:3000';
  }
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/$/, '');
}

const baseURL = normalizeBaseUrl(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
});
