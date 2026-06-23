// @ts-nocheck
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = 'qa@example.com';
const PASS = 'changeme123';
const DOCX = '/Users/timofejbruhin/Downloads/Договор_субподряд_монтаж_СПЕЦЭНЕРГО_локальное_тушение_11032026.docx';
const SHOTS = 'test-results/audit-screenshots';

const snap = async (p: Page, n: string) => {
  await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });
  console.log(`📸 ${n}`);
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

const errors: string[] = [];

test.describe.serial('AI Сметчик — Full Audit', () => {
  test('01 Landing', async ({ page }) => {
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await snap(page, '01-landing');
    expect(await page.title()).toContain('Сметчик');
  });

  test('02 Login page', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
    await snap(page, '02-login');
    const btns = await page.locator('button').allTextContents();
    console.log('Buttons:', btns.filter(b => b.trim()).join(', '));
  });

  test('03 Login', async ({ page }) => {
    const ok = await login(page);
    await snap(page, '03-after-login');
    expect(ok).toBeTruthy();
  });

  test('04 Dashboard', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await snap(page, '04-dashboard');
    // Check dropzone exists
    const dropzone = page.locator('[class*="border-dashed"]').first();
    console.log('Dropzone:', await dropzone.isVisible());
    // Check analyze button
    const analyzeBtn = page.locator('button:has-text("Анализ Файла")').first();
    console.log('Analyze btn:', await analyzeBtn.isVisible());
    console.log('Analyze btn disabled:', await analyzeBtn.isDisabled());
  });

  test('05 Upload & Analyze', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    
    // Upload file via hidden input
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(DOCX);
    await page.waitForTimeout(1000);
    await snap(page, '05-file-selected');
    
    // Check file name appears
    const bodyText = await page.textContent('body');
    console.log('File visible:', bodyText?.includes('Договор') || bodyText?.includes('СПЕЦЭНЕРГО'));
    
    // Click analyze
    const analyzeBtn = page.locator('button:has-text("Анализ Файла")').first();
    const disabled = await analyzeBtn.isDisabled();
    console.log('Analyze disabled:', disabled);
    
    if (!disabled) {
      // Close any modal overlay that may be blocking
      const overlay = page.locator('[data-state="open"][aria-hidden="true"]').first();
      if (await overlay.isVisible().catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      await analyzeBtn.click({ force: true });
      console.log('✅ Clicked Анализ Файла');
      await page.waitForTimeout(2000);
      await snap(page, '05-processing-dialog');
      
      // Wait for processing (check every 5s for up to 120s)
      let done = false;
      for (let i = 0; i < 24; i++) {
        await page.waitForTimeout(5000);
        const txt = await page.textContent('body');
        const hasResult = txt?.includes('позиц') || txt?.includes('Результат') || txt?.includes('Спецификация') || txt?.includes('Калькулятор');
        const hasErr = txt?.includes('Ошибка') || txt?.includes('ошибк') || txt?.includes('failed');
        
        if (hasResult) {
          console.log(`✅ Got results at ${(i+1)*5}s`);
          await snap(page, '05-analysis-done');
          done = true;
          break;
        }
        if (hasErr) {
          console.log(`⚠️ Error at ${(i+1)*5}s`);
          await snap(page, '05-analysis-error');
          // Get error text from multiple possible locations
          const errEl = await page.locator('[role="alert"], [class*="destructive"], [class*="error"]').first().textContent().catch(() => '');
          const bodySnippet = txt?.substring(txt.indexOf('Ошибка'), txt.indexOf('Ошибка') + 300) || '';
          console.log('Error element:', errEl?.substring(0, 300));
          console.log('Error body:', bodySnippet.substring(0, 300));
          done = true;
          break;
        }
        console.log(`⏳ ${(i+1)*5}s...`);
      }
      if (!done) {
        console.log('⏰ Timeout 120s');
        await snap(page, '05-analysis-timeout');
      }
    }
  });

  test('06 Profile', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle' });
    await snap(page, '06-profile');
    const inputs = await page.locator('input').count();
    const btns = await page.locator('button').allTextContents();
    console.log(`Profile: ${inputs} inputs, buttons: ${btns.filter(b=>b.trim()).join('|')}`);
  });

  test('07 Billing', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/billing`, { waitUntil: 'networkidle' });
    await snap(page, '07-billing');
    const btns = await page.locator('button').allTextContents();
    console.log(`Billing buttons: ${btns.filter(b=>b.trim()).join('|')}`);
  });

  test('08 Price Base', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard/price-base`, { waitUntil: 'networkidle' });
    await snap(page, '08-price-base');
    const btns = await page.locator('button').allTextContents();
    console.log(`Price base buttons: ${btns.filter(b=>b.trim()).join('|')}`);
  });

  test('09 All routes', async ({ page }) => {
    await login(page);
    const routes = [
      '/dashboard', '/dashboard/billing', '/dashboard/calculator',
      '/dashboard/price-base', '/dashboard/profile', '/dashboard/companies',
      '/dashboard/support', '/dashboard/tickets', '/dashboard/training',
      '/partner', '/crm',
    ];
    for (const r of routes) {
      await page.goto(`${BASE}${r}`, { waitUntil: 'networkidle', timeout: 10000 });
      const ok = !page.url().includes('auth/login');
      console.log(`${ok?'✅':'❌'} ${r}`);
      if (ok) await snap(page, `09-${r.replace(/\//g,'-')}`);
    }
  });

  test('10 Console errors', async () => {
    console.log('\n=== ERRORS ===');
    const unique = [...new Set(errors)];
    if (!unique.length) { console.log('✅ None'); return; }
    console.log(`❌ ${unique.length}:`);
    unique.forEach((e,i) => console.log(`  ${i+1}. ${e.substring(0,200)}`));
  });
});
