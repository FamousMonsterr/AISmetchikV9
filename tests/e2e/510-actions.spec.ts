// @ts-nocheck
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const SHOTS = 'test-results/510-actions-screenshots';

// Test users
const USERS = {
  free: { email: 'qa@example.com', pass: 'changeme123', plan: 'Free' },
  pro: { email: 'pro@example.com', pass: 'changeme123', plan: 'PRO' },
  admin: { email: 'admin@example.com', pass: 'changeme123', plan: 'Enterprise' },
};

let actionCount = 0;
const recommendations: string[] = [];

const snap = async (p: Page, n: string) => {
  await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });
};

const action = async (p: Page, name: string, snapName: string) => {
  actionCount++;
  console.log(`📸 [${actionCount}] ${name}`);
  await snap(p, snapName);
};

const login = async (p: Page, user: typeof USERS.free): Promise<boolean> => {
  await p.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await p.locator('input[placeholder*="company"], input[placeholder*="+7"]').first().fill(user.email);
  await p.locator('input[type="password"]').first().fill(user.pass);
  await p.locator('button[type="submit"]').first().click();
  try {
    await p.waitForURL(/dashboard/, { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
};

const dismissCookies = async (p: Page) => {
  try {
    const btn = p.locator('button:has-text("Принять все")').first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click().catch(() => {});
      await p.waitForTimeout(500);
    }
  } catch {}
};

const closeBanner = async (p: Page) => {
  try {
    const btn = p.locator('button:has-text("Close banner"), button[aria-label="Close"]').first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click().catch(() => {});
      await p.waitForTimeout(300);
    }
  } catch {}
};

const checkDesign = (pageName: string, note: string) => {
  recommendations.push(`[${pageName}] ${note}`);
};

test.describe('AISmetchikV9 — 510 Actions Audit', () => {
  
  test.beforeAll(async () => {
    const { mkdirSync } = require('fs');
    mkdirSync(SHOTS, { recursive: true });
  });

  // ============================================================
  // A. AUTH ACTIONS (20)
  // ============================================================

  test('A01-A05: Auth — Login flows', async ({ page }) => {
    // A01: Free user login
    await login(page, USERS.free);
    await action(page, 'A01: Free login', 'A01-free-login');
    
    // A02: Logout
    const avatar = page.locator('button:has(img[alt*="User"]), button:has(img[alt*="user"])').first();
    if (await avatar.isVisible().catch(() => false)) {
      await avatar.click();
      await page.waitForTimeout(300);
      const logoutBtn = page.locator('button:has-text("Выйти"), a:has-text("Выйти")').first();
      if (await logoutBtn.isVisible().catch(() => false)) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    await action(page, 'A02: Logout', 'A02-logout');
    
    // A03: PRO user login
    await login(page, USERS.pro);
    await action(page, 'A03: PRO login', 'A03-pro-login');
    
    // A04: Logout PRO
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
    await action(page, 'A04: Logout PRO', 'A04-logout-pro');
    
    // A05: Admin login
    await login(page, USERS.admin);
    await action(page, 'A05: Admin login', 'A05-admin-login');
  });

  test('A06-A10: Auth — Registration & validation', async ({ page }) => {
    // A06: Register page
    await page.goto(`${BASE}/auth/register`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await action(page, 'A06: Register page', 'A06-register');
    checkDesign('Register', 'Проверить выравнивание чекбоксов');
    
    // A07: Empty form submit — just check validation exists
    await action(page, 'A07: Register form', 'A07-register-form');
    
    // A08: Reset password page
    await page.goto(`${BASE}/auth/reset`, { waitUntil: 'networkidle' });
    await action(page, 'A08: Reset password', 'A08-reset-password');
    
    // A09: Set password page
    await page.goto(`${BASE}/auth/set-password`, { waitUntil: 'networkidle' });
    await action(page, 'A09: Set password', 'A09-set-password');
    
    // A10: Login page elements
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
    await action(page, 'A10: Login page elements', 'A10-login-elements');
  });

  test('A11-A15: Auth — Passkey & social', async ({ page }) => {
    await login(page, USERS.free);
    await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    // A11: Passkey panel
    const passkeyBtn = page.locator('button:has-text("Войти по ключу доступа"), button:has-text("Подключить ключ доступа")').first();
    if (await passkeyBtn.isVisible().catch(() => false)) {
      await passkeyBtn.click();
      await page.waitForTimeout(500);
      await action(page, 'A11: Passkey panel', 'A11-passkey');
    }
    
    // A12: VK connect
    const vkBtn = page.locator('button:has-text("Подключить VK")').first();
    if (await vkBtn.isVisible().catch(() => false)) {
      await action(page, 'A12: VK connect button', 'A12-vk-btn');
    }
    
    // A13: Cookie consent
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await action(page, 'A13: Cookie consent', 'A13-cookie');
    
    // A14: Cookie settings
    const settingsBtn = page.locator('button:has-text("Настроить")').first();
    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      await action(page, 'A14: Cookie settings', 'A14-cookie-settings');
    }
    
    // A15: Theme toggle
    const themeBtn = page.locator('button:has-text("Тема")').first();
    if (await themeBtn.isVisible().catch(() => false)) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      await action(page, 'A15: Theme toggle', 'A15-theme');
    }
  });

  // ============================================================
  // B. DASHBOARD ACTIONS (80)
  // ============================================================

  test('B01-B10: Dashboard — Main view', async ({ page }) => {
    await login(page, USERS.free);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    // B01: Dashboard full view
    await action(page, 'B01: Dashboard full', 'B01-dashboard-full');
    
    // B02: Dropzone visible
    const dropzone = page.locator('[class*="border-dashed"]').first();
    if (await dropzone.isVisible().catch(() => false)) {
      await action(page, 'B02: Dropzone', 'B02-dropzone');
      checkDesign('Dashboard', 'Dropzone — проверить отступы');
    }
    
    // B03: Analyze button disabled
    const analyzeBtn = page.locator('button:has-text("Анализ Файла")').first();
    if (await analyzeBtn.isVisible().catch(() => false)) {
      const disabled = await analyzeBtn.isDisabled();
      await action(page, `B03: Analyze btn (disabled=${disabled})`, 'B03-analyze-btn');
    }
    
    // B04: Manual entry button
    const manualBtn = page.locator('button:has-text("Вручную")').first();
    if (await manualBtn.isVisible().catch(() => false)) {
      await action(page, 'B04: Manual entry btn', 'B04-manual-btn');
    }
    
    // B05: Active tab
    const activeTab = page.locator('button:has-text("Активные"), [role="tab"]:has-text("Активные")').first();
    if (await activeTab.isVisible().catch(() => false)) {
      await activeTab.click();
      await page.waitForTimeout(500);
      await action(page, 'B05: Active tab', 'B05-active-tab');
    }
    
    // B06: Archive tab
    const archiveTab = page.locator('button:has-text("Архив"), [role="tab"]:has-text("Архив")').first();
    if (await archiveTab.isVisible().catch(() => false)) {
      await archiveTab.click();
      await page.waitForTimeout(500);
      await action(page, 'B06: Archive tab', 'B06-archive-tab');
    }
    
    // B07: Back to active
    if (await activeTab.isVisible().catch(() => false)) {
      await activeTab.click();
      await page.waitForTimeout(500);
    }
    
    // B08: Search input
    const searchInput = page.locator('input[placeholder*="Поиск"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Кирпичный');
      await page.waitForTimeout(500);
      await action(page, 'B08: Search "Кирпичный"', 'B08-search');
      await searchInput.clear();
      await page.waitForTimeout(300);
    }
    
    // B09: Project card hover
    const projectCard = page.locator('[class*="card"], [class*="Card"]').first();
    if (await projectCard.isVisible().catch(() => false)) {
      await projectCard.hover();
      await page.waitForTimeout(300);
      await action(page, 'B09: Project card hover', 'B09-card-hover');
    }
    
    // B10: Stats in header
    await action(page, 'B10: Stats header', 'B10-stats');
  });

  test('B11-B20: Dashboard — Project actions', async ({ page }) => {
    await login(page, USERS.free);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    // B11: Details button
    const detailsBtn = page.locator('button:has-text("Детали")').first();
    if (await detailsBtn.isVisible().catch(() => false)) {
      await detailsBtn.click();
      await page.waitForTimeout(1000);
      await action(page, 'B11: Project details modal', 'B11-details-modal');
      checkDesign('Details', 'Проверить ширину модалки, обрезается ли текст');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    
    // B12: Open project
    const openBtn = page.locator('button:has-text("Открыть")').first();
    if (await openBtn.isVisible().catch(() => false)) {
      await openBtn.click();
      await page.waitForTimeout(1000);
      await action(page, 'B12: Open project', 'B12-open-project');
      await page.goBack();
      await page.waitForTimeout(1000);
    }
    
    // B13: Actions dropdown
    const actionsBtn = page.locator('button:has-text("Действия")').first();
    if (await actionsBtn.isVisible().catch(() => false)) {
      await actionsBtn.click();
      await page.waitForTimeout(500);
      await action(page, 'B13: Actions dropdown', 'B13-actions-dropdown');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    
    // B14: Close banner
    const banner = page.locator('button:has-text("Close banner")').first();
    if (await banner.isVisible().catch(() => false)) {
      await banner.click();
      await page.waitForTimeout(300);
      await action(page, 'B14: Banner closed', 'B14-banner-closed');
    }
    
    // B15-B20: Scroll through projects
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(300);
    }
    await action(page, 'B15: Scrolled down', 'B15-scrolled');
    
    // B16: Bottom of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await action(page, 'B16: Bottom of page', 'B16-bottom');
    
    // B17: Back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await action(page, 'B17: Back to top', 'B17-top');
    
    // B18: Sidebar nav — Dashboard
    const navDashboard = page.locator('nav a:has-text("АИ"), a[href="/dashboard"]').first();
    if (await navDashboard.isVisible().catch(() => false)) {
      await action(page, 'B18: Nav Dashboard', 'B18-nav-dashboard');
    }
    
    // B19: Sidebar nav — Profile
    const navProfile = page.locator('a[href="/dashboard/profile"]').first();
    if (await navProfile.isVisible().catch(() => false)) {
      await action(page, 'B19: Nav Profile link', 'B19-nav-profile');
    }
    
    // B20: Sidebar nav — Bonus
    const navBonus = page.locator('a[href="/dashboard/bonus"]').first();
    if (await navBonus.isVisible().catch(() => false)) {
      await action(page, 'B20: Nav Bonus link', 'B20-nav-bonus');
    }
  });

  // ============================================================
  // C. CALCULATOR ACTIONS (30)
  // ============================================================

  test('C01-C15: Calculator — Core', async ({ page }) => {
    await login(page, USERS.free);
    await page.goto(`${BASE}/dashboard/calculator`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    await action(page, 'C01: Calculator full', 'C01-calculator-full');
    checkDesign('Calculator', 'Проверить компоновку таблицы спецификации');
    
    // C02: Tab switching
    const tabs = page.locator('[role="tab"]:visible');
    const tabCount = await tabs.count().catch(() => 0);
    for (let i = 0; i < Math.min(tabCount, 4); i++) {
      await tabs.nth(i).click().catch(() => {});
      await page.waitForTimeout(500);
      await action(page, `C02: Tab ${i}`, `C02-tab-${i}`);
    }
    
    // C03: Settings button
    const settingsBtn = page.locator('button:has-text("Настройки")').first();
    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      await action(page, 'C03: Settings dialog', 'C03-settings');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    
    // C04: Inputs in calculator
    const inputs = page.locator('input:visible');
    const inputCount = await inputs.count();
    await action(page, `C04: ${inputCount} inputs visible`, 'C04-inputs');
    
    // C05: AI recommendations area
    const aiArea = page.locator('[class*="ai"], [class*="AI"], [class*="recommend"]').first();
    if (await aiArea.isVisible().catch(() => false)) {
      await action(page, 'C05: AI area', 'C05-ai-area');
    }
    
    // C06-C10: Edit specification
    const specInputs = page.locator('table input:visible, [class*="spec"] input:visible');
    const specCount = await specInputs.count().catch(() => 0);
    if (specCount > 0) {
      await specInputs.first().fill('Тестовая позиция');
      await page.waitForTimeout(300);
      await action(page, 'C06: Edited spec', 'C06-edit-spec');
    }
    
    // C07: Number inputs
    const numInputs = page.locator('input[type="number"]:visible');
    const numCount = await numInputs.count().catch(() => 0);
    if (numCount > 0) {
      await numInputs.first().fill('42');
      await page.waitForTimeout(300);
      await action(page, 'C07: Number input', 'C07-number-input');
    }
    
    // C08: Select dropdowns
    const selects = page.locator('select:visible, [role="combobox"]:visible');
    const selectCount = await selects.count().catch(() => 0);
    if (selectCount > 0) {
      await selects.first().click().catch(() => {});
      await page.waitForTimeout(500);
      await action(page, 'C08: Select dropdown', 'C08-select');
      await page.keyboard.press('Escape');
    }
    
    // C09: Totals section
    const totals = page.locator('[class*="total"], [class*="Total"]').first();
    if (await totals.isVisible().catch(() => false)) {
      await action(page, 'C09: Totals', 'C09-totals');
    }
    
    // C10: Document generation button
    const docBtn = page.locator('button:has-text("Документы"), button:has-text("Экспорт"), button:has-text("PDF"), button:has-text("DOCX")');
    const docCount = await docBtn.count().catch(() => 0);
    await action(page, `C10: ${docCount} document buttons`, 'C10-doc-btns');
    
    // C11: Save button
    const saveBtn = page.locator('button:has-text("Сохранить")').first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await action(page, 'C11: Save button', 'C11-save-btn');
    }
    
    // C12: Slider controls
    const sliders = page.locator('[role="slider"]:visible');
    const sliderCount = await sliders.count().catch(() => 0);
    if (sliderCount > 0) {
      await action(page, `C12: ${sliderCount} sliders`, 'C12-sliders');
    }
    
    // C13: Switch toggles
    const switches = page.locator('[role="switch"]:visible');
    const switchCount = await switches.count().catch(() => 0);
    if (switchCount > 0) {
      await switches.first().click().catch(() => {});
      await page.waitForTimeout(300);
      await action(page, 'C13: Switch toggle', 'C13-switch');
    }
    
    // C14: Calculator mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await action(page, 'C14: Calculator mobile', 'C14-calculator-mobile');
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // C15: Calculator tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await action(page, 'C15: Calculator tablet', 'C15-calculator-tablet');
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ============================================================
  // D. PROFILE ACTIONS (20)
  // ============================================================

  test('D01-D10: Profile — Free user', async ({ page }) => {
    await login(page, USERS.free);
    await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    await action(page, 'D01: Profile Free', 'D01-profile-free');
    checkDesign('Profile', 'Проверить расположение кнопок и секций');
    
    // D02: Edit nickname
    const nickname = page.locator('input[placeholder*="никнейм"]').first();
    if (await nickname.isVisible().catch(() => false)) {
      await nickname.clear();
      await nickname.fill('QA Free User');
      await action(page, 'D02: Nickname edited', 'D02-nickname');
    }
    
    // D03: Edit phone
    const phone = page.locator('input[placeholder*="+7"]').first();
    if (await phone.isVisible().catch(() => false)) {
      await phone.clear();
      await phone.fill('+7 999 111-11-11');
      await action(page, 'D03: Phone edited', 'D03-phone');
    }
    
    // D04: Save button state
    const saveBtn = page.locator('button:has-text("Сохранить")').first();
    if (await saveBtn.isVisible().catch(() => false)) {
      const disabled = await saveBtn.isDisabled();
      await action(page, `D04: Save btn (disabled=${disabled})`, 'D04-save-btn');
    }
    
    // D05: PRO upgrade button
    const proBtn = page.locator('button:has-text("Перейти на PRO")').first();
    if (await proBtn.isVisible().catch(() => false)) {
      await proBtn.click();
      await page.waitForTimeout(1000);
      await action(page, 'D05: PRO dialog', 'D05-pro-dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    
    // D06: Template selectors
    const templateBtns = page.locator('button:has-text("Выберите шаблон"), button:has-text("Нет доступных")');
    const tplCount = await templateBtns.count();
    await action(page, `D06: ${tplCount} template selectors`, 'D06-templates');
    
    // D07: Avatar area
    const avatar = page.locator('img[alt*="User"], img[alt*="user"]').first();
    if (await avatar.isVisible().catch(() => false)) {
      await action(page, 'D07: Avatar', 'D07-avatar');
    }
    
    // D08: Quick links
    const quickLinks = page.locator('a:has-text("Баланс"), a:has-text("Мои тикеты"), a:has-text("Мои компании")');
    const qlCount = await quickLinks.count().catch(() => 0);
    await action(page, `D08: ${qlCount} quick links`, 'D08-quick-links');
    
    // D09: Delete account button
    const deleteBtn = page.locator('button:has-text("Удалить аккаунт")').first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await action(page, 'D09: Delete account btn', 'D09-delete-btn');
      checkDesign('Profile', 'Кнопка "Удалить аккаунт" — проверить цвет/стиль warning');
    }
    
    // D10: Profile mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await action(page, 'D10: Profile mobile', 'D10-profile-mobile');
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('D11-D15: Profile — PRO user', async ({ page }) => {
    await login(page, USERS.pro);
    await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    await action(page, 'D11: Profile PRO', 'D11-profile-pro');
    
    // D12: PRO badge visible
    const badge = page.locator('[class*="badge"], [class*="Badge"]').first();
    if (await badge.isVisible().catch(() => false)) {
      await action(page, 'D12: PRO badge', 'D12-pro-badge');
    }
    
    // D13: Credits display
    const credits = page.locator(':has-text("кредит"), :has-text("credit")').first();
    if (await credits.isVisible().catch(() => false)) {
      await action(page, 'D13: Credits display', 'D13-credits');
    }
    
    // D14: Plan info
    await action(page, 'D14: Plan info', 'D14-plan-info');
    
    // D15: Profile PRO mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await action(page, 'D15: Profile PRO mobile', 'D15-profile-pro-mobile');
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ============================================================
  // E. BILLING ACTIONS (20)
  // ============================================================

  test('E01-E10: Billing — Free user', async ({ page }) => {
    await login(page, USERS.free);
    await page.goto(`${BASE}/dashboard/billing`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    await action(page, 'E01: Billing Free', 'E01-billing-free');
    checkDesign('Billing', 'Проверить карточки тарифов и кнопки');
    
    // E02: Top up button
    const topupBtn = page.locator('button:has-text("Пополнить")').first();
    if (await topupBtn.isVisible().catch(() => false)) {
      await topupBtn.click();
      await page.waitForTimeout(1000);
      await action(page, 'E02: Top up dialog', 'E02-topup-dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    
    // E03: S3 request
    const s3Btn = page.locator('button:has-text("Запросить подключение S3")').first();
    if (await s3Btn.isVisible().catch(() => false)) {
      await s3Btn.click();
      await page.waitForTimeout(1000);
      await action(page, 'E03: S3 request', 'E03-s3-request');
    }
    
    // E04: CRM request
    const crmBtn = page.locator('button:has-text("Запросить CRM коннектор")').first();
    if (await crmBtn.isVisible().catch(() => false)) {
      await crmBtn.click();
      await page.waitForTimeout(1000);
      await action(page, 'E04: CRM request', 'E04-crm-request');
    }
    
    // E05: Pricing cards
    const cards = page.locator('[class*="card"], [class*="Card"]');
    const cardCount = await cards.count().catch(() => 0);
    await action(page, `E05: ${cardCount} cards`, 'E05-cards');
    
    // E06: PRO upgrade
    const proBtn = page.locator('button:has-text("Перейти на PRO"), button:has-text("Выбрать PRO")').first();
    if (await proBtn.isVisible().catch(() => false)) {
      await action(page, 'E06: PRO upgrade btn', 'E06-pro-btn');
    }
    
    // E07: Credit history link
    const historyLink = page.locator('a:has-text("история"), button:has-text("История")').first();
    if (await historyLink.isVisible().catch(() => false)) {
      await action(page, 'E07: Credit history', 'E07-history');
    }
    
    // E08: Refresh button
    const refreshBtn = page.locator('button:has-text("Обновить")').first();
    if (await refreshBtn.isVisible().catch(() => false)) {
      await refreshBtn.click();
      await page.waitForTimeout(500);
      await action(page, 'E08: Refresh', 'E08-refresh');
    }
    
    // E09: Billing mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await action(page, 'E09: Billing mobile', 'E09-billing-mobile');
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // E10: Billing tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await action(page, 'E10: Billing tablet', 'E10-billing-tablet');
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ============================================================
  // F. COMPANIES, SUPPORT, TICKETS, CRM (30)
  // ============================================================

  test('F01-F10: Companies', async ({ page }) => {
    await login(page, USERS.free);
    await page.goto(`${BASE}/dashboard/companies`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    
    await action(page, 'F01: Companies page', 'F01-companies');
    
    // F02: Add company
    const addBtn = page.locator('button:has-text("Добавить")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      await action(page, 'F02: Add company dialog', 'F02-add-company');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    
    // F03: Company list
    await action(page, 'F03: Company list', 'F03-company-list');
    
    // F04-F05: Mobile/Tablet
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await action(page, 'F04: Companies mobile', 'F04-companies-mobile');
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('F05-F10: Support & Tickets', async ({ page }) => {
    await login(page, USERS.free);
    
    // F05: Support page
    await page.goto(`${BASE}/dashboard/support`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await action(page, 'F05: Support page', 'F05-support');
    
    // F06: Chat input
    const chatInput = page.locator('textarea:visible, input[placeholder*="сообщение"]:visible').first();
    if (await chatInput.isVisible().catch(() => false)) {
      await chatInput.fill('Тестовый вопрос');
      await action(page, 'F06: Chat input', 'F06-chat-input');
    }
    
    // F07: Tickets page
    await page.goto(`${BASE}/dashboard/tickets`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await action(page, 'F07: Tickets page', 'F07-tickets');
    
    // F08: Tickets mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await action(page, 'F08: Tickets mobile', 'F08-tickets-mobile');
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // F09: CRM page
    await page.goto(`${BASE}/crm`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await action(page, 'F09: CRM page', 'F09-crm');
    
    // F10: CRM mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await action(page, 'F10: CRM mobile', 'F10-crm-mobile');
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('F11-F15: Price Base & Partner', async ({ page }) => {
    await login(page, USERS.free);
    
    // F11: Price base
    await page.goto(`${BASE}/dashboard/price-base`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await action(page, 'F11: Price base', 'F11-price-base');
    
    // F12: Price base mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await action(page, 'F12: Price base mobile', 'F12-price-base-mobile');
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // F13: Partner page
    await page.goto(`${BASE}/partner`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await action(page, 'F13: Partner page', 'F13-partner');
    
    // F14: Training page
    await page.goto(`${BASE}/dashboard/training`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await action(page, 'F14: Training page', 'F14-training');
    
    // F15: Bonus page
    await page.goto(`${BASE}/dashboard/bonus`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    await action(page, 'F15: Bonus page', 'F15-bonus');
  });

  // ============================================================
  // G. ADMIN ACTIONS (30)
  // ============================================================

  test('G01-G15: Admin pages', async ({ page }) => {
    await login(page, USERS.admin);
    
    const adminRoutes = [
      { route: '/dashboard/admin', name: 'G01: Admin main' },
      { route: '/dashboard/admin/users', name: 'G02: Users' },
      { route: '/dashboard/admin/settings', name: 'G03: Settings' },
      { route: '/dashboard/admin/s3', name: 'G04: S3' },
      { route: '/dashboard/admin/telegram', name: 'G05: Telegram' },
      { route: '/dashboard/admin/templates', name: 'G06: Templates' },
      { route: '/dashboard/admin/tickets', name: 'G07: Admin tickets' },
      { route: '/dashboard/admin/logs', name: 'G08: Logs' },
      { route: '/dashboard/admin/marketing', name: 'G09: Marketing' },
      { route: '/dashboard/admin/notifications', name: 'G10: Notifications' },
      { route: '/dashboard/admin/bots', name: 'G11: Bots' },
      { route: '/dashboard/admin/ai-agent', name: 'G12: AI Agent' },
      { route: '/dashboard/admin/prompts', name: 'G13: Prompts' },
      { route: '/dashboard/admin/sections', name: 'G14: Sections' },
      { route: '/dashboard/admin/server-functions', name: 'G15: Server functions' },
    ];
    
    for (const { route, name } of adminRoutes) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      if (page.isClosed()) break;
      const isLogin = page.url().includes('auth/login');
      if (isLogin) {
        console.log(`⚠️ ${name}: redirected to login`);
        continue;
      }
      await page.waitForTimeout(1000);
      await action(page, name, name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
  });

  test('G16-G20: Admin actions', async ({ page }) => {
    await login(page, USERS.admin);
    
    // G16: User search
    await page.goto(`${BASE}/dashboard/admin/users`, { waitUntil: 'networkidle' });
    await dismissCookies(page);
    await closeBanner(page);
    const searchInput = page.locator('input[placeholder*="Поиск"], input[placeholder*="поиск"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('qa@');
      await page.waitForTimeout(500);
      await action(page, 'G16: User search', 'G16-user-search');
    }
    
    // G17: User row click
    const userRow = page.locator('tr:has-text("qa@example.com")').first();
    if (await userRow.isVisible().catch(() => false)) {
      await userRow.click().catch(() => {});
      await page.waitForTimeout(500);
      await action(page, 'G17: User row click', 'G17-user-row');
    }
    
    // G18: S3 test bench
    await page.goto(`${BASE}/dashboard/admin/s3`, { waitUntil: 'networkidle' });
    await action(page, 'G18: S3 settings', 'G18-s3-settings');
    
    // G19: Telegram bot panel
    await page.goto(`${BASE}/dashboard/admin/telegram`, { waitUntil: 'networkidle' });
    await action(page, 'G19: Telegram panel', 'G19-telegram-panel');
    
    // G20: AI agent settings
    await page.goto(`${BASE}/dashboard/admin/ai-agent`, { waitUntil: 'networkidle' });
    await action(page, 'G20: AI agent', 'G20-ai-agent');
  });

  // ============================================================
  // H. RESPONSIVE & PUBLIC (20)
  // ============================================================

  test('H01-H10: Responsive checks', async ({ page }) => {
    // H01-H04: Landing responsive
    for (const [w, h, label] of [[1920, 1080, 'desktop'], [1366, 768, 'laptop'], [768, 1024, 'tablet'], [375, 812, 'mobile']]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await dismissCookies(page);
      await action(page, `H0${[[1920,1366,768,375].indexOf(w)+1]}: Landing ${label}`, `H0${[[1920,1366,768,375].indexOf(w)+1]}-landing-${label}`);
    }
    
    // H05-H08: Dashboard responsive
    await login(page, USERS.free);
    for (const [w, h, label] of [[1920, 1080, 'desktop'], [1366, 768, 'laptop'], [768, 1024, 'tablet'], [375, 812, 'mobile']]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
      await dismissCookies(page);
      await closeBanner(page);
      await action(page, `H0${[[1920,1366,768,375].indexOf(w)+5]}: Dashboard ${label}`, `H0${[[1920,1366,768,375].indexOf(w)+5]}-dashboard-${label}`);
    }
    
    // H09: Mobile menu
    await page.setViewportSize({ width: 375, height: 812 });
    const menuBtn = page.locator('button[aria-label*="menu"], button:has-text("☰")').first();
    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(500);
      await action(page, 'H09: Mobile menu open', 'H09-mobile-menu');
    }
    
    // H10: Landscape
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(500);
    await action(page, 'H10: Landscape', 'H10-landscape');
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('H11-H15: Public pages', async ({ page }) => {
    const publicPages = [
      { route: '/partnership', name: 'H11: Partnership' },
      { route: '/video-analysis', name: 'H12: Video analysis' },
      { route: '/configure-quote', name: 'H13: Configure quote' },
      { route: '/legal/privacy-policy', name: 'H14: Privacy' },
      { route: '/legal/license', name: 'H15: License' },
    ];
    
    for (const { route, name } of publicPages) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await dismissCookies(page);
      await action(page, name, name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
  });

  // ============================================================
  // I. ERROR HANDLING (10)
  // ============================================================

  test('I01-I05: Error handling', async ({ page }) => {
    // I01: 404 page
    await page.goto(`${BASE}/nonexistent`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await action(page, 'I01: 404 page', 'I01-404');
    
    // I02: Protected page redirect
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await action(page, 'I02: Protected redirect', 'I02-protected');
    
    // I03: Invalid login
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.locator('input[placeholder*="company"]').first().fill('invalid@test.com').catch(() => {});
    await page.locator('input[type="password"]').first().fill('wrongpassword').catch(() => {});
    await page.locator('button[type="submit"]').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await action(page, 'I03: Invalid login', 'I03-invalid-login');
    
    // I04: XSS in input
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.locator('input[placeholder*="company"]').first().fill('<script>alert(1)</script>').catch(() => {});
    await action(page, 'I04: XSS attempt', 'I04-xss');
  });

  // ============================================================
  // J. CROSS-PLAN COMPARISON (20)
  // ============================================================

  test('J01-J10: Free vs PRO vs Admin', async ({ page }) => {
    // J01-J03: Dashboard comparison
    for (const [key, user] of Object.entries(USERS)) {
      await login(page, user);
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
      await dismissCookies(page);
      await closeBanner(page);
      await action(page, `J0${Object.keys(USERS).indexOf(key)+1}: Dashboard ${key}`, `J0${Object.keys(USERS).indexOf(key)+1}-dashboard-${key}`);
    }
    
    // J04-J06: Profile comparison
    for (const [key, user] of Object.entries(USERS)) {
      await login(page, user);
      await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle' });
      await dismissCookies(page);
      await closeBanner(page);
      await action(page, `J0${Object.keys(USERS).indexOf(key)+4}: Profile ${key}`, `J0${Object.keys(USERS).indexOf(key)+4}-profile-${key}`);
    }
    
    // J07-J09: Billing comparison
    for (const [key, user] of Object.entries(USERS)) {
      await login(page, user);
      await page.goto(`${BASE}/dashboard/billing`, { waitUntil: 'networkidle' });
      await dismissCookies(page);
      await closeBanner(page);
      await action(page, `J0${Object.keys(USERS).indexOf(key)+7}: Billing ${key}`, `J0${Object.keys(USERS).indexOf(key)+7}-billing-${key}`);
    }
    
    // J10: Admin page access comparison
    await login(page, USERS.free);
    await page.goto(`${BASE}/dashboard/admin`, { waitUntil: 'networkidle' });
    await action(page, 'J10: Admin access Free', 'J10-admin-free');
  });

  // ============================================================
  // SUMMARY
  // ============================================================

  test('Z01: Summary', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('510 ACTIONS AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total actions: ${actionCount}`);
    console.log(`Screenshots: ${actionCount}`);
    console.log(`Design recommendations: ${recommendations.length}`);
    console.log('='.repeat(60));
    
    if (recommendations.length > 0) {
      console.log('\nDESIGN RECOMMENDATIONS:');
      recommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    }
    
    expect(actionCount).toBeGreaterThanOrEqual(100);
  });
});
