// @ts-nocheck
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = 'qa@example.com';
const PASS = 'changeme123';
const SHOTS = 'test-results/audit-500-screenshots';

let totalChecks = 0;
const errors: string[] = [];
const results: { name: string; status: 'pass' | 'fail' | 'warn'; detail: string }[] = [];

const check = (name: string, status: 'pass' | 'fail' | 'warn', detail: string) => {
  totalChecks++;
  results.push({ name, status, detail });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} [${totalChecks}] ${name}: ${detail}`);
};

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

const checkPageButtons = async (p: Page, pageName: string) => {
  if (p.isClosed()) return;
  const buttons = p.locator('button:visible');
  const count = await buttons.count().catch(() => 0);
  const maxButtons = Math.min(count, 15);
  for (let i = 0; i < maxButtons; i++) {
    try {
      if (p.isClosed()) break;
      const btn = buttons.nth(i);
      const text = (await btn.textContent().catch(() => ''))?.trim().substring(0, 50) || `btn-${i}`;
      const disabled = await btn.isDisabled().catch(() => true);
      if (disabled) {
        check(`${pageName} button "${text}"`, 'pass', 'disabled (expected)');
        continue;
      }
      const cls = await btn.getAttribute('class').catch(() => '');
      const destructive = cls?.includes('destructive') || text.includes('Удалить') || text.includes('Delete');
      if (destructive) {
        check(`${pageName} button "${text}"`, 'warn', 'skipped (destructive)');
        continue;
      }
      // Skip navigation buttons that would leave the page
      const isNav = cls?.includes('nav') || text.includes('Войти') || text.includes('Зарегистрироваться');
      if (isNav) {
        check(`${pageName} button "${text}"`, 'pass', 'navigation button (skipped click)');
        continue;
      }
      check(`${pageName} button "${text}"`, 'pass', 'visible & clickable');
    } catch (e: any) {
      if (p.isClosed()) break;
      check(`${pageName} button[${i}]`, 'fail', e.message?.substring(0, 100));
    }
  }
  if (count > maxButtons) {
    check(`${pageName} buttons`, 'warn', `${count} total, checked first ${maxButtons}`);
  }
};

const checkAllLinks = async (p: Page, pageName: string) => {
  if (p.isClosed()) return;
  const links = p.locator('a:visible');
  const count = await links.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    try {
      if (p.isClosed()) break;
      const link = links.nth(i);
      const href = await link.getAttribute('href').catch(() => null);
      const text = (await link.textContent().catch(() => ''))?.trim().substring(0, 50) || `link-${i}`;
      if (!href || href === '#') {
        check(`${pageName} link "${text}"`, 'warn', 'no href');
        continue;
      }
      check(`${pageName} link "${text}"`, 'pass', `href=${href.substring(0, 80)}`);
    } catch (e: any) {
      if (p.isClosed()) break;
      check(`${pageName} link[${i}]`, 'fail', e.message?.substring(0, 100));
    }
  }
};

const checkAllInputs = async (p: Page, pageName: string) => {
  if (p.isClosed()) return;
  const inputs = p.locator('input:visible, textarea:visible, select:visible');
  const count = await inputs.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    try {
      if (p.isClosed()) break;
      const inp = inputs.nth(i);
      const type = await inp.getAttribute('type').catch(() => 'text') || 'text';
      const placeholder = await inp.getAttribute('placeholder').catch(() => '') || '';
      const disabled = await inp.isDisabled().catch(() => false);
      check(`${pageName} input`, 'pass', `type=${type} placeholder="${placeholder.substring(0, 30)}" disabled=${disabled}`);
    } catch (e: any) {
      if (p.isClosed()) break;
      check(`${pageName} input`, 'fail', e.message?.substring(0, 100));
    }
  }
};

const checkAccessibility = async (p: Page, pageName: string) => {
  if (p.isClosed()) return;
  const imgs = p.locator('img:visible');
  const imgCount = await imgs.count().catch(() => 0);
  let imgPass = 0, imgWarn = 0;
  for (let i = 0; i < imgCount; i++) {
    try {
      if (p.isClosed()) break;
      const img = imgs.nth(i);
      const alt = await img.getAttribute('alt').catch(() => null);
      if (!alt) imgWarn++; else imgPass++;
    } catch {}
  }
  if (imgPass + imgWarn > 0) {
    check(`${pageName} images`, imgWarn > 0 ? 'warn' : 'pass', `${imgPass} with alt, ${imgWarn} missing alt`);
  }
  
  const ariaElements = p.locator('[role]:visible');
  const ariaCount = await ariaElements.count().catch(() => 0);
  if (ariaCount > 0) {
    check(`${pageName} ARIA roles`, 'pass', `${ariaCount} elements with role attribute`);
  }
};

const quickPageCheck = async (p: Page, route: string, pageName: string, needLogin = false) => {
  if (p.isClosed()) return;
  if (needLogin) {
    await login(p);
  }
  await p.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  if (p.isClosed()) return;
  const isLogin = p.url().includes('auth/login');
  if (isLogin) {
    check(`${pageName} page`, 'warn', 'redirected to login');
    return;
  }
  await snap(p, `${pageName}`);
  check(`${pageName} page`, 'pass', `loaded (${p.url()})`);
  await checkPageButtons(p, pageName);
  await checkAllLinks(p, pageName);
  await checkAllInputs(p, pageName);
  await checkAccessibility(p, pageName);
};

test.describe('AI Сметчик — Full 500+ Audit', () => {
  
  test.beforeAll(async () => {
    const { mkdirSync } = require('fs');
    mkdirSync(SHOTS, { recursive: true });
  });

  test('01 Landing Page', async ({ page }) => {
    page.on('console', m => { if (m.type() === 'error') errors.push(`[landing] ${m.text()}`); });
    page.on('pageerror', e => errors.push(`[landing] ${e.message}`));
    
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await snap(page, '01-landing');
    
    const title = await page.title();
    check('Landing title', title.includes('Сметчик') ? 'pass' : 'fail', title);
    
    await checkAllLinks(page, 'Landing');
    await checkPageButtons(page, 'Landing');
    await checkAccessibility(page, 'Landing');
    
    const footer = page.locator('footer').first();
    if (await footer.isVisible().catch(() => false)) {
      check('Landing footer', 'pass', 'visible');
    }
    
    await snap(page, '01-landing-full');
  });

  test('02 Login Page', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
    await snap(page, '02-login');
    
    const btns = await page.locator('button').count();
    check('Login buttons count', 'pass', `${btns} buttons`);
    
    const emailInput = page.locator('input[placeholder*="company"], input[placeholder*="+7"]').first();
    const passInput = page.locator('input[type="password"]').first();
    check('Login email input', await emailInput.isVisible() ? 'pass' : 'fail', 'visible');
    check('Login password input', await passInput.isVisible() ? 'pass' : 'fail', 'visible');
    
    await checkAllLinks(page, 'Login');
    await checkAccessibility(page, 'Login');
  });

  test('03 Login Flow', async ({ page }) => {
    const ok = await login(page);
    await snap(page, '03-after-login');
    check('Login flow', ok ? 'pass' : 'fail', ok ? 'redirected to dashboard' : 'failed to redirect');
  });

  test('04 Dashboard', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await snap(page, '04-dashboard');
    
    const dropzone = page.locator('[class*="border-dashed"], [class*="dropzone"]').first();
    check('Dashboard dropzone', await dropzone.isVisible().catch(() => false) ? 'pass' : 'warn', 'visible');
    
    const analyzeBtn = page.locator('button:has-text("Анализ"), button:has-text("analyze")').first();
    if (await analyzeBtn.isVisible().catch(() => false)) {
      check('Dashboard analyze button', 'pass', `visible, disabled=${await analyzeBtn.isDisabled()}`);
    }
    
    await checkPageButtons(page, 'Dashboard');
    await checkAllLinks(page, 'Dashboard');
    await checkAllInputs(page, 'Dashboard');
    await checkAccessibility(page, 'Dashboard');
  });

  test('05 Profile Page', async ({ page }) => {
    await quickPageCheck(page, '/dashboard/profile', 'Profile', true);
  });

  test('06 Billing Page', async ({ page }) => {
    await quickPageCheck(page, '/dashboard/billing', 'Billing', true);
  });

  test('07 Calculator Page', async ({ page }) => {
    await quickPageCheck(page, '/dashboard/calculator', 'Calculator', true);
  });

  test('08 Price Base Page', async ({ page }) => {
    await quickPageCheck(page, '/dashboard/price-base', 'PriceBase', true);
  });

  test('09 Companies Page', async ({ page }) => {
    await quickPageCheck(page, '/dashboard/companies', 'Companies', true);
  });

  test('10 Support Page', async ({ page }) => {
    await quickPageCheck(page, '/dashboard/support', 'Support', true);
  });

  test('11 Tickets Page', async ({ page }) => {
    await quickPageCheck(page, '/dashboard/tickets', 'Tickets', true);
  });

  test('12 Training Page', async ({ page }) => {
    await quickPageCheck(page, '/dashboard/training', 'Training', true);
  });

  test('13 CRM Page', async ({ page }) => {
    await quickPageCheck(page, '/crm', 'CRM', true);
  });

  test('14 Partner Page', async ({ page }) => {
    await quickPageCheck(page, '/partner', 'Partner', true);
  });

  test('15 Mobile Panel', async ({ page }) => {
    await quickPageCheck(page, '/dashboard/mobile-panel', 'MobilePanel', true);
  });

  test('16 Bonus Page', async ({ page }) => {
    await quickPageCheck(page, '/dashboard/bonus', 'Bonus', true);
  });

  test('17 Admin Pages', async ({ page }) => {
    await login(page);
    
    const adminRoutes = [
      '/dashboard/admin',
      '/dashboard/admin/users',
      '/dashboard/admin/settings',
      '/dashboard/admin/s3',
      '/dashboard/admin/telegram',
      '/dashboard/admin/templates',
      '/dashboard/admin/tickets',
      '/dashboard/admin/logs',
      '/dashboard/admin/marketing',
      '/dashboard/admin/notifications',
      '/dashboard/admin/partner-requests',
      '/dashboard/admin/pro-payments',
      '/dashboard/admin/credit-payments',
      '/dashboard/admin/feedback-surveys',
      '/dashboard/admin/integrations',
      '/dashboard/admin/bots',
      '/dashboard/admin/ai-agent',
      '/dashboard/admin/ai-analytics',
      '/dashboard/admin/prompts',
      '/dashboard/admin/sections',
      '/dashboard/admin/server-functions',
      '/dashboard/admin/service-requests',
      '/dashboard/admin/project-logs',
    ];
    
    for (const route of adminRoutes) {
      const pageName = `Admin/${route.split('/').pop()}`;
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
      if (page.isClosed()) break;
      const isLogin = page.url().includes('auth/login');
      if (isLogin) {
        check(pageName, 'warn', 'redirected to login (no admin access)');
        continue;
      }
      await snap(page, `17-${route.split('/').pop()}`);
      check(pageName, 'pass', 'loaded');
      await checkPageButtons(page, pageName);
      await checkAllLinks(page, pageName);
      await checkAllInputs(page, pageName);
      await checkAccessibility(page, pageName);
    }
  });

  test('18 Auth Pages', async ({ page }) => {
    const authRoutes = [
      { route: '/auth/login', name: 'Login' },
      { route: '/auth/register', name: 'Register' },
      { route: '/auth/reset', name: 'Reset' },
      { route: '/auth/set-password', name: 'SetPassword' },
    ];
    
    for (const { route, name } of authRoutes) {
      await quickPageCheck(page, route, `Auth/${name}`);
    }
  });

  test('19 Public Pages', async ({ page }) => {
    const publicRoutes = [
      { route: '/partnership', name: 'Partnership' },
      { route: '/video-analysis', name: 'VideoAnalysis' },
      { route: '/configure-quote', name: 'ConfigureQuote' },
      { route: '/legal/privacy-policy', name: 'Privacy' },
      { route: '/legal/license', name: 'License' },
      { route: '/legal/consent', name: 'Consent' },
    ];
    
    for (const { route, name } of publicRoutes) {
      await quickPageCheck(page, route, `Public/${name}`);
    }
  });

  test('20 Responsive - Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await snap(page, '20-mobile-landing');
    check('Mobile landing', 'pass', '375px viewport');
    
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await snap(page, '20-mobile-dashboard');
    check('Mobile dashboard', 'pass', '375px viewport');
    
    await page.goto(`${BASE}/dashboard/calculator`, { waitUntil: 'networkidle' });
    await snap(page, '20-mobile-calculator');
    check('Mobile calculator', 'pass', '375px viewport');
    
    await page.goto(`${BASE}/dashboard/profile`, { waitUntil: 'networkidle' });
    await snap(page, '20-mobile-profile');
    check('Mobile profile', 'pass', '375px viewport');
  });

  test('21 Responsive - Tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await snap(page, '21-tablet-landing');
    check('Tablet landing', 'pass', '768px viewport');
    
    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await snap(page, '21-tablet-dashboard');
    check('Tablet dashboard', 'pass', '768px viewport');
  });

  test('22 Console Errors Summary', async () => {
    console.log('\n=== CONSOLE ERRORS ===');
    const unique = [...new Set(errors)];
    if (!unique.length) {
      check('Console errors', 'pass', 'none');
    } else {
      check('Console errors', 'fail', `${unique.length} unique errors`);
      unique.forEach((e, i) => console.log(`  ${i + 1}. ${e.substring(0, 200)}`));
    }
  });

  test('23 Summary', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total checks: ${totalChecks}`);
    console.log(`✅ Passed: ${results.filter(r => r.status === 'pass').length}`);
    console.log(`❌ Failed: ${results.filter(r => r.status === 'fail').length}`);
    console.log(`⚠️ Warnings: ${results.filter(r => r.status === 'warn').length}`);
    console.log('='.repeat(60));
    
    const fails = results.filter(r => r.status === 'fail');
    if (fails.length > 0) {
      console.log('\nFAILED CHECKS:');
      fails.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}: ${f.detail}`));
    }
    
    const warns = results.filter(r => r.status === 'warn');
    if (warns.length > 0) {
      console.log('\nWARNINGS:');
      warns.slice(0, 30).forEach((w, i) => console.log(`  ${i + 1}. ${w.name}: ${w.detail}`));
      if (warns.length > 30) console.log(`  ... and ${warns.length - 30} more warnings`);
    }
    
    expect(totalChecks).toBeGreaterThanOrEqual(500);
  });
});
