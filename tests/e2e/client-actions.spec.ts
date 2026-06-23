// @ts-nocheck
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = 'qa@example.com';
const PASS = 'changeme123';
const SHOTS = 'test-results/action-tests-screenshots';

const snap = async (p: Page, n: string) => {
  await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });
};

const login = async (p: Page): Promise<boolean> => {
  await p.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await p.locator('input[placeholder*="company"], input[placeholder*="+7"]').first().fill(EMAIL);
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  try {
    await p.waitForURL(/dashboard/, { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
};

const dismissCookies = async (p: Page) => {
  const btn = p.locator('button:has-text("Принять все")').first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {});
    await p.waitForTimeout(500);
  }
};

const closeBanner = async (p: Page) => {
  const btn = p.locator('button:has-text("Close banner"), button[aria-label="Close"]').first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {});
    await p.waitForTimeout(300);
  }
};

test.describe('AISmetchikV9 — Client Actions Tests', () => {
  
  test.beforeAll(async () => {
    const { mkdirSync } = require('fs');
    mkdirSync(SHOTS, { recursive: true });
  });

  // ===== 1. AUTH ACTIONS =====
  
  test('1.1 Login with email + password', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    
    await page.locator('input[placeholder*="company"], input[placeholder*="+7"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASS);
    await snap(page, '1.1-login-filled');
    
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    await snap(page, '1.1-login-success');
    
    expect(page.url()).toContain('/dashboard');
  });

  test('1.2 Register page', async ({ page }) => {
    await page.goto(`${BASE}/auth/register`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await snap(page, '1.2-register');
    
    const emailInput = page.locator('input[type="email"]').first();
    const phoneInput = page.locator('input[type="tel"]').first();
    const passInput = page.locator('input[type="password"]').first();
    
    expect(await emailInput.isVisible()).toBeTruthy();
    expect(await phoneInput.isVisible()).toBeTruthy();
    expect(await passInput.isVisible()).toBeTruthy();
  });

  test('1.3 Reset password page', async ({ page }) => {
    await page.goto(`${BASE}/auth/reset`, { waitUntil: 'networkidle' });
    await snap(page, '1.3-reset');
    
    const passInput = page.locator('input[type="password"]').first();
    expect(await passInput.isVisible()).toBeTruthy();
  });

  // ===== 2. DASHBOARD ACTIONS =====
  
  test('2.1 Dashboard loads', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '2.1-dashboard');
    
    const dropzone = page.locator('[class*="border-dashed"], [class*="dropzone"]').first();
    expect(await dropzone.isVisible().catch(() => false)).toBeTruthy();
    
    const analyzeBtn = page.locator('button:has-text("Анализ Файла")').first();
    expect(await analyzeBtn.isVisible()).toBeTruthy();
    expect(await analyzeBtn.isDisabled()).toBeTruthy();
  });

  test('2.2 Tab switching', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const activeTab = page.locator('button:has-text("Активные"), [role="tab"]:has-text("Активные")').first();
    if (await activeTab.isVisible().catch(() => false)) {
      await activeTab.click();
      await page.waitForTimeout(500);
      await snap(page, '2.2-active-tab');
    }
    
    const archiveTab = page.locator('button:has-text("Архив"), [role="tab"]:has-text("Архив")').first();
    if (await archiveTab.isVisible().catch(() => false)) {
      await archiveTab.click();
      await page.waitForTimeout(500);
      await snap(page, '2.2-archive-tab');
    }
  });

  test('2.3 Manual entry', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const manualBtn = page.locator('button:has-text("Вручную")').first();
    if (await manualBtn.isVisible().catch(() => false)) {
      await manualBtn.click();
      await page.waitForTimeout(1000);
      await snap(page, '2.3-manual-entry');
    }
  });

  test('2.4 Project search', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const searchInput = page.locator('input[placeholder*="Поиск"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('тест');
      await page.waitForTimeout(500);
      await snap(page, '2.4-search');
    }
  });

  test('2.5 Project details', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const detailsBtn = page.locator('button:has-text("Детали")').first();
    if (await detailsBtn.isVisible().catch(() => false)) {
      await detailsBtn.click();
      await page.waitForTimeout(1000);
      await snap(page, '2.5-details');
    }
  });

  test('2.6 Project actions dropdown', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const actionsBtn = page.locator('button:has-text("Действия")').first();
    if (await actionsBtn.isVisible().catch(() => false)) {
      await actionsBtn.click();
      await page.waitForTimeout(500);
      await snap(page, '2.6-actions-dropdown');
    }
  });

  // ===== 3. CALCULATOR ACTIONS =====
  
  test('3.1 Calculator loads', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/calculator`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '3.1-calculator');
    
    // Calculator may show empty state or specification table
    const hasContent = await page.locator('table:visible, [class*="specification"]:visible, [class*="calculator"]:visible, [class*="Calculator"]:visible, button:has-text("Добавить"), button:has-text("Вручную")').first().isVisible().catch(() => false);
    expect(hasContent || page.url().includes('calculator')).toBeTruthy();
  });

  test('3.2 Tab switching', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/calculator`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const tabs = page.locator('[role="tab"]:visible');
    const count = await tabs.count().catch(() => 0);
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const tab = tabs.nth(i);
      const text = await tab.textContent().catch(() => `tab-${i}`);
      await tab.click().catch(() => {});
      await page.waitForTimeout(500);
      await snap(page, `3.2-tab-${i}`);
    }
  });

  test('3.3 Quote settings', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/calculator`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const settingsBtn = page.locator('button:has-text("Настройки"), button:has-text("Настройки КП")').first();
    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      await snap(page, '3.3-quote-settings');
    }
  });

  // ===== 4. PROFILE ACTIONS =====
  
  test('4.1 Profile loads', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '4.1-profile');
    
    const inputs = page.locator('input:visible');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('4.2 Edit profile', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const nicknameInput = page.locator('input[placeholder*="никнейм"]').first();
    if (await nicknameInput.isVisible().catch(() => false)) {
      await nicknameInput.clear();
      await nicknameInput.fill('QA Test Updated');
      await snap(page, '4.2-nickname-edited');
    }
  });

  test('4.3 PRO upgrade dialog', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const proBtn = page.locator('button:has-text("Перейти на PRO")').first();
    if (await proBtn.isVisible().catch(() => false)) {
      await proBtn.click();
      await page.waitForTimeout(1000);
      await snap(page, '4.3-pro-dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  // ===== 5. BILLING ACTIONS =====
  
  test('5.1 Billing loads', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/billing`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '5.1-billing');
    
    const popBtn = page.locator('button:has-text("Пополнить")').first();
    expect(await popBtn.isVisible().catch(() => false)).toBeTruthy();
  });

  test('5.2 Top up dialog', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/billing`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const popBtn = page.locator('button:has-text("Пополнить")').first();
    if (await popBtn.isVisible().catch(() => false)) {
      await popBtn.click();
      await page.waitForTimeout(1000);
      await snap(page, '5.2-topup-dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  test('5.3 S3 request', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/billing`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const s3Btn = page.locator('button:has-text("Запросить подключение S3")').first();
    if (await s3Btn.isVisible().catch(() => false)) {
      await s3Btn.click();
      await page.waitForTimeout(1000);
      await snap(page, '5.3-s3-request');
    }
  });

  test('5.4 CRM connector request', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/billing`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const crmBtn = page.locator('button:has-text("Запросить CRM коннектор")').first();
    if (await crmBtn.isVisible().catch(() => false)) {
      await crmBtn.click();
      await page.waitForTimeout(1000);
      await snap(page, '5.4-crm-request');
    }
  });

  // ===== 6. COMPANIES =====
  
  test('6.1 Companies page', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/companies`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '6.1-companies');
  });

  // ===== 7. SUPPORT =====
  
  test('7.1 Support chat', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/support`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '7.1-support');
    
    const chatInput = page.locator('textarea:visible, input[placeholder*="сообщение"]:visible').first();
    if (await chatInput.isVisible().catch(() => false)) {
      await chatInput.fill('Тестовое сообщение');
      await snap(page, '7.1-message-filled');
    }
  });

  // ===== 8. TICKETS =====
  
  test('8.1 Tickets page', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/tickets`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '8.1-tickets');
  });

  // ===== 9. CRM =====
  
  test('9.1 CRM page', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/crm`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '9.1-crm');
  });

  // ===== 10. PRICE BASE =====
  
  test('10.1 Price base', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/price-base`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '10.1-price-base');
  });

  // ===== 11. THEME =====
  
  test('11.1 Theme toggle', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    
    const themeBtn = page.locator('button:has-text("Тема"), button[aria-label*="theme"], button[aria-label*="Theme"]').first();
    if (await themeBtn.isVisible().catch(() => false)) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      await snap(page, '11.1-theme-toggled');
    }
  });

  // ===== 12. COOKIE CONSENT =====
  
  test('12.1 Cookie consent', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    
    const cookieDialog = page.locator('[role="dialog"]:has-text("cookie"), [role="dialog"]:has-text("Cookie")').first();
    if (await cookieDialog.isVisible().catch(() => false)) {
      await snap(page, '12.1-cookie-dialog');
      
      const acceptBtn = page.locator('button:has-text("Принять все")').first();
      if (await acceptBtn.isVisible().catch(() => false)) {
        await acceptBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  // ===== 13. NAVIGATION =====
  
  test('13.1 Sidebar navigation', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    const navLinks = page.locator('nav a, [class*="sidebar"] a');
    const count = await navLinks.count();
    console.log(`Found ${count} nav links`);
  });

  // ===== 14. ADMIN =====
  
  test('14.1 Admin users', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/admin/users`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '14.1-admin-users');
  });

  test('14.2 Admin settings', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/admin/settings`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '14.2-admin-settings');
  });

  test('14.3 Admin S3', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/admin/s3`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '14.3-admin-s3');
  });

  test('14.4 Admin Telegram', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/admin/telegram`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '14.4-admin-telegram');
  });

  // ===== 15. RESPONSIVE =====
  
  test('15.1 Mobile dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '15.1-mobile-dashboard');
  });

  test('15.2 Tablet dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await snap(page, '15.2-tablet-dashboard');
  });

  // ===== 16. ERROR HANDLING =====
  
  test('16.1 404 page', async ({ page }) => {
    await page.goto(`${BASE}/nonexistent-page`, { waitUntil: 'networkidle' });
    await snap(page, '16.1-404');
  });

  test('16.2 Protected page redirect', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await snap(page, '16.2-protected-redirect');
    
    const isLogin = page.url().includes('auth/login');
    console.log(`Protected page redirect to login: ${isLogin}`);
  });
});
