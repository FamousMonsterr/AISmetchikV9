import { test, expect } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL;
const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;

const shouldRun = !!baseURL;
const shouldRunAuthenticated = !!baseURL && !!userEmail && !!userPassword;

test.describe('public flows', () => {
  test.skip(!shouldRun, 'E2E_BASE_URL is not set');

  test('shows referral trial hint on registration', async ({ page }) => {
    await page.goto('/auth/register?ref=TESTREF');
    await expect(page.getByText('Бонус от друга!')).toBeVisible();
    await expect(page.getByText('доступ к PRO')).toBeVisible();
  });
});

test.describe('authenticated flows', () => {
  test.skip(!shouldRunAuthenticated, 'E2E_USER_EMAIL/E2E_USER_PASSWORD not set');

  const login = async (page: any) => {
    await page.goto('/auth/login');
    await page.fill('#login-email', userEmail!);
    await page.fill('#login-password', userPassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
  };

  test('billing shows credit history block', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/billing');
    await expect(page.getByText('История кредитов')).toBeVisible();
  });
});
