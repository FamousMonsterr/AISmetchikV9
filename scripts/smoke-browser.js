#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const startedAt = new Date();
const timestamp = startedAt.toISOString().replace(/[:.]/g, '-');
const artifactDir = path.resolve(process.cwd(), '.artifacts', 'smoke', timestamp);
const baseUrl = (process.env.SMOKE_BASE_URL || process.env.E2E_BASE_URL || 'https://aismetchik.ru').replace(/\/$/, '');

function normalizeUrl(input) {
  return (input.startsWith('http') ? input : `https://${input}`).replace(/\/$/, '');
}

const configuredSmokeDomains = (process.env.SMOKE_DOMAINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const smokeDomains = configuredSmokeDomains.length
  ? configuredSmokeDomains.map(normalizeUrl)
  : [
      baseUrl,
      'https://admin.aismetchik.ru',
      'https://lk.aismetchik.ru',
      'https://crm.aismetchik.ru',
      'https://partner.aismetchik.ru',
      'https://m.aismetchik.ru',
    ];

const uploadFlowFlag = (process.env.SMOKE_BROWSER_UPLOAD_FLOW || process.env.SMOKE_UPLOAD_FLOW || '').trim().toLowerCase();
const runUploadFlow = ['1', 'true', 'yes', 'on'].includes(uploadFlowFlag);

function resolveSurfaceUrls(domains, fallbackBaseUrl) {
  const resolved = {
    root: normalizeUrl(fallbackBaseUrl),
    admin: null,
    lk: null,
    crm: null,
    partner: null,
    mobile: null,
  };

  for (const domain of domains.map(normalizeUrl)) {
    const hostname = new URL(domain).hostname.toLowerCase();
    if (hostname.startsWith('admin.')) resolved.admin = domain;
    else if (hostname.startsWith('lk.')) resolved.lk = domain;
    else if (hostname.startsWith('crm.')) resolved.crm = domain;
    else if (hostname.startsWith('partner.')) resolved.partner = domain;
    else if (hostname.startsWith('m.')) resolved.mobile = domain;
    else resolved.root = domain;
  }

  return resolved;
}

const surfaceUrls = resolveSurfaceUrls(smokeDomains, baseUrl);
const dashboardBaseUrl = surfaceUrls.lk || surfaceUrls.root;
const authBaseUrl = surfaceUrls.lk || surfaceUrls.root;

const tempUser = {
  email: `autoreg_${Date.now()}@example.com`,
  password: `AutoReg!${Date.now()}A`,
  phone: '+79990000000',
};

const steps = [];
const plan = [];

function ensureArtifacts() {
  fs.mkdirSync(artifactDir, { recursive: true });
}

function logStep(entry) {
  const step = {
    at: new Date().toISOString(),
    ...entry,
  };
  steps.push(step);
  const printable = `[${step.status}] ${step.name}${step.url ? ` @ ${step.url}` : ''}${step.detail ? ` :: ${step.detail}` : ''}`;
  console.log(printable);
}

function pushPlan(title, reason, severity = 'medium') {
  plan.push({ title, reason, severity });
}

function safeName(input) {
  return input.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function saveScreenshot(page, name) {
  const target = path.join(artifactDir, `${safeName(name)}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

async function createSamplePdf() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const lines = [
    'Smoke test specification',
    '1. IP camera Hikvision DS-2CD1023G0-I - 2 pcs',
    '2. UTP cat.5e cable - 100 m',
    '3. PoE switch 8 ports - 1 pcs',
  ];

  let y = 760;
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y,
      size: 14,
      font,
      color: rgb(0.15, 0.15, 0.18),
    });
    y -= 24;
  }

  const target = path.join(artifactDir, 'smoke-project.pdf');
  fs.writeFileSync(target, await pdf.save());
  return target;
}

async function fetchHealth(url) {
  const response = await fetch(`${url}/api/healthz`, { redirect: 'manual' });
  return {
    url: `${url}/api/healthz`,
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    location: response.headers.get('location') || null,
    server: response.headers.get('server') || null,
  };
}

async function collectPublicSmoke() {
  const results = [];
  for (const url of smokeDomains) {
    const result = await fetchHealth(url);
    results.push(result);
    logStep({
      name: `health:${url}`,
      status: result.ok ? 'ok' : 'error',
      url: result.url,
      detail: `status=${result.status}${result.server ? ` server=${result.server}` : ''}${result.location ? ` location=${result.location}` : ''}`,
    });
    if (!result.ok) {
      pushPlan(`Починить health-check ${url}`, `Сейчас ${result.status} на ${result.url}`, 'high');
    }
  }
  return results;
}

async function openPage(context) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(String(error));
  });

  return { page, consoleErrors, pageErrors };
}

async function visitAndAssert(page, targetUrl, checks = []) {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  for (const check of checks) {
    if (check.kind === 'text') {
      await page.getByText(check.value, { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 });
    }
    if (check.kind === 'url') {
      await page.waitForURL(check.value, { timeout: 30_000 });
    }
  }
}

async function visitPages(page, entries, planPrefix) {
  for (const entry of entries) {
    try {
      const checks = entry.text ? [{ kind: 'text', value: entry.text }] : [];
      await visitAndAssert(page, entry.url, checks);
      if (entry.acceptUrlPatterns?.some((pattern) => pattern.test(page.url()))) {
        logStep({ name: entry.name, status: 'ok', url: page.url(), detail: `loaded by url pattern ${page.url()}` });
      } else {
        logStep({ name: entry.name, status: 'ok', url: page.url(), detail: entry.text ? `loaded ${entry.text}` : `loaded ${page.url()}` });
      }
      await saveScreenshot(page, entry.name);
    } catch (error) {
      const currentUrl = page.url() || entry.url;
      if (entry.acceptUrlPatterns?.some((pattern) => pattern.test(currentUrl))) {
        logStep({ name: entry.name, status: 'ok', url: currentUrl, detail: `accepted by url pattern after text timeout` });
        await saveScreenshot(page, entry.name).catch(() => {});
        continue;
      }
      logStep({ name: entry.name, status: 'error', url: page.url() || entry.url, detail: error.message });
      pushPlan(`${planPrefix}: ${entry.name}`, error.message, 'high');
      await saveScreenshot(page, `error-${entry.name}`).catch(() => {});
    }
  }
}

async function visitSurface(page, entry) {
  const response = await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  const currentUrl = page.url();
  const status = response?.status() ?? null;

  let matched = false;
  if (entry.text) {
    try {
      await page.getByText(entry.text, { exact: false }).first().waitFor({ state: 'visible', timeout: 20_000 });
      matched = true;
    } catch {
      matched = false;
    }
  }
  if (!matched && entry.acceptUrlPatterns?.some((pattern) => pattern.test(currentUrl))) {
    matched = true;
  }

  if (!matched) {
    throw new Error(`unexpected surface result status=${status} finalUrl=${currentUrl}`);
  }

  logStep({
    name: entry.name,
    status: 'ok',
    url: currentUrl,
    detail: `status=${status} expected=${entry.text || entry.acceptUrlPatterns?.map((item) => item.toString()).join(',')}`,
  });
  await saveScreenshot(page, entry.name);
}

async function visitSurfacePages(page) {
  const entries = [
    { name: 'surface-partner', url: surfaceUrls.partner ? `${surfaceUrls.partner}/` : `${surfaceUrls.root}/partner`, text: 'Партнёрский кабинет' },
    {
      name: 'surface-mobile',
      url: surfaceUrls.mobile ? `${surfaceUrls.mobile}/` : `${surfaceUrls.root}/dashboard/mobile-panel`,
      text: 'Загрузить файл для анализа',
      acceptUrlPatterns: [/\/auth\/login\b/, /^https:\/\/lk\./],
    },
    {
      name: 'surface-crm',
      url: surfaceUrls.crm ? `${surfaceUrls.crm}/` : `${surfaceUrls.root}/crm`,
      text: 'CRM Workspace',
      acceptUrlPatterns: [/\/dashboard\b/, /\/auth\/login\b/, /^https:\/\/lk\./],
    },
    {
      name: 'surface-admin',
      url: surfaceUrls.admin ? `${surfaceUrls.admin}/` : `${surfaceUrls.root}/dashboard/admin`,
      text: 'Главное',
      acceptUrlPatterns: [/\/dashboard\b/, /\/auth\/login\b/, /^https:\/\/lk\./],
    },
  ];

  for (const entry of entries) {
    try {
      await visitSurface(page, entry);
    } catch (error) {
      logStep({ name: entry.name, status: 'error', url: page.url() || entry.url, detail: error.message });
      pushPlan(`Починить surface smoke ${entry.name}`, error.message, 'high');
      await saveScreenshot(page, `error-${entry.name}`).catch(() => {});
    }
  }
}

async function registerTempUser(page) {
  await visitAndAssert(page, `${authBaseUrl}/auth/register`, [{ kind: 'text', value: 'Создать аккаунт' }]);
  await page.fill('#register-email', tempUser.email);
  await page.fill('#register-phone', tempUser.phone);
  await page.fill('#register-password', tempUser.password);
  await page.click('#privacy');
  await page.click('#terms');
  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 120_000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  if (!/\/dashboard\b/.test(page.url())) {
    await loginTempUser(page);
  }

  logStep({
    name: 'register-temp-user',
    status: 'ok',
    url: page.url(),
    detail: `temp user registered: ${tempUser.email}`,
  });
}

async function loginTempUser(page) {
  await visitAndAssert(page, `${authBaseUrl}/auth/login`, [{ kind: 'text', value: 'Войти' }]);
  await page.fill('#login-email', tempUser.email);
  await page.fill('#login-password', tempUser.password);
  await Promise.all([
    page.waitForURL(/\/dashboard\b/, { timeout: 120_000 }),
    page.click('button[type="submit"]'),
  ]);
  logStep({
    name: 'login-temp-user',
    status: 'ok',
    url: page.url(),
    detail: `temp user authorized: ${tempUser.email}`,
  });
}

async function closeWelcomeModalIfPresent(page) {
  const button = page.getByRole('button', { name: 'Начать работу' });
  if (await button.count()) {
    await button.click().catch(() => {});
  }
}

async function openDashboardPages(page) {
  const pages = [
    { url: `${dashboardBaseUrl}/dashboard`, text: 'Новый расчет', name: 'page-dashboard' },
    { url: `${dashboardBaseUrl}/dashboard/profile`, text: 'Основные настройки', name: 'page-profile' },
    { url: `${dashboardBaseUrl}/dashboard/billing`, text: 'Пополнить баланс', name: 'page-billing' },
    { url: `${dashboardBaseUrl}/dashboard/tickets`, text: 'Мои тикеты', name: 'page-tickets' },
    { url: `${dashboardBaseUrl}/dashboard/companies`, text: 'Мои компании', name: 'page-companies' },
    { url: `${dashboardBaseUrl}/dashboard/price-base`, text: 'Моя база цен', name: 'page-price-base' },
    { url: `${dashboardBaseUrl}/dashboard/bonus`, text: 'Бонус', name: 'page-bonus' },
  ];

  await visitPages(page, pages, 'Починить LK smoke');
}

async function createProjectAndSmokeCalculator(page) {
  const samplePdf = await createSamplePdf();
  await visitAndAssert(page, `${dashboardBaseUrl}/dashboard`, [{ kind: 'text', value: 'Новый расчет' }]);
  await closeWelcomeModalIfPresent(page);

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(samplePdf);
  await page.getByRole('button', { name: /Анализ Файла/i }).click();

  const possibleUrls = [/dashboard\/calculator/, /lk\..*dashboard\/calculator/];
  const calculatorWait = (async () => {
    for (const pattern of possibleUrls) {
      try {
        await page.waitForURL(pattern, { timeout: 240_000 });
        return { kind: 'calculator' };
      } catch {
        // try next pattern
      }
    }
    return { kind: 'timeout' };
  })();

  const errorWait = (async () => {
    const alertTitle = page.getByText('Произошла ошибка', { exact: false }).first();
    await alertTitle.waitFor({ state: 'visible', timeout: 240_000 });
    const alert = page.locator('[role="alert"]').last();
    const text = (await alert.innerText().catch(() => '')) || (await page.locator('body').innerText().catch(() => ''));
    return { kind: 'error', text: text.slice(0, 1000) };
  })();

  const raceResult = await Promise.race([calculatorWait, errorWait]);

  if (raceResult.kind === 'error') {
    throw new Error(`Проект не дошёл до калькулятора: ${raceResult.text}`);
  }

  if (raceResult.kind !== 'calculator') {
    const text = await page.locator('body').innerText().catch(() => '');
    throw new Error(`Не удалось дождаться открытия калькулятора после анализа. Текущий URL=${page.url()} body=${text.slice(0, 500)}`);
  }

  const requiredSections = [
    'Детали проекта',
    'Настройки КП',
    'Документы по проекту',
    'Спецификация',
  ];
  for (const section of requiredSections) {
    await page.getByText(section, { exact: false }).waitFor({ state: 'visible', timeout: 60_000 });
  }

  logStep({
    name: 'calculator:project-opened',
    status: 'ok',
    url: page.url(),
    detail: 'project analysis completed and calculator loaded',
  });
  await saveScreenshot(page, 'calculator-main');

  for (const section of requiredSections) {
    try {
      await page.getByText(section, { exact: false }).click({ timeout: 15_000 });
      logStep({ name: `calculator-section:${section}`, status: 'ok', url: page.url(), detail: 'section reachable' });
    } catch (error) {
      logStep({ name: `calculator-section:${section}`, status: 'error', url: page.url(), detail: error.message });
      pushPlan(`Починить секцию проекта: ${section}`, error.message, 'high');
    }
  }
}

async function skipProjectUploadSmoke() {
  logStep({
    name: 'calculator:upload-flow',
    status: 'skip',
    url: `${dashboardBaseUrl}/dashboard`,
    detail: 'upload flow disabled by default; set SMOKE_BROWSER_UPLOAD_FLOW=1 to enable',
  });
}

async function cleanupAccount(requestContext) {
  try {
    const loginResp = await requestContext.post(`${authBaseUrl}/api/v1/auth/login`, {
      data: { email: tempUser.email, password: tempUser.password },
    });
    if (!loginResp.ok()) {
      logStep({ name: 'cleanup-login', status: 'warn', url: `${authBaseUrl}/api/v1/auth/login`, detail: `status=${loginResp.status()}` });
      return;
    }
    const loginJson = await loginResp.json();
    const token = loginJson?.accessToken;
    if (!token) {
      logStep({ name: 'cleanup-token', status: 'warn', url: `${baseUrl}/api/v1/auth/login`, detail: 'accessToken not found' });
      return;
    }
    const deleteResp = await requestContext.delete(`${authBaseUrl}/api/v1/auth/account`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logStep({
      name: 'cleanup-account',
      status: deleteResp.ok() ? 'ok' : 'warn',
      url: `${authBaseUrl}/api/v1/auth/account`,
      detail: `status=${deleteResp.status()}`,
    });
  } catch (error) {
    logStep({ name: 'cleanup-account', status: 'warn', url: `${authBaseUrl}/api/v1/auth/account`, detail: error.message });
  }
}

function writeArtifacts(publicHealth, consoleErrors, pageErrors) {
  const summary = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    baseUrl,
    tempUserEmail: tempUser.email,
    publicHealth,
    steps,
    pageErrors,
    consoleErrors,
    plan,
  };
  fs.writeFileSync(path.join(artifactDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  const md = [
    '# Smoke Report',
    '',
    `- startedAt: ${summary.startedAt}`,
    `- finishedAt: ${summary.finishedAt}`,
    `- baseUrl: ${baseUrl}`,
    `- tempUserEmail: ${tempUser.email}`,
    '',
    '## Public Health',
    ...publicHealth.map((item) => `- ${item.url}: status=${item.status}${item.server ? ` server=${item.server}` : ''}${item.location ? ` location=${item.location}` : ''}`),
    '',
    '## Steps',
    ...steps.map((step) => `- ${step.at} [${step.status}] ${step.name}${step.url ? ` @ ${step.url}` : ''}${step.detail ? ` :: ${step.detail}` : ''}`),
    '',
    '## Console Errors',
    ...(consoleErrors.length ? consoleErrors.map((item) => `- ${item.text}`) : ['- none']),
    '',
    '## Page Errors',
    ...(pageErrors.length ? pageErrors.map((item) => `- ${item}`) : ['- none']),
    '',
    '## Implementation Plan',
    ...(plan.length ? plan.map((item) => `- [${item.severity}] ${item.title}: ${item.reason}`) : ['- No critical smoke defects found.']),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(artifactDir, 'summary.md'), md, 'utf8');
}

async function main() {
  ensureArtifacts();
  const publicHealth = await collectPublicSmoke();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const { page, consoleErrors, pageErrors } = await openPage(context);

  try {
    await visitPages(page, [
      { name: 'public-home', url: `${surfaceUrls.root}/`, text: 'Начать бесплатно' },
      { name: 'public-partnership', url: `${surfaceUrls.root}/partnership`, text: 'партнерской программе', acceptUrlPatterns: [/\/partnership\b/] },
      { name: 'public-login', url: `${authBaseUrl}/auth/login`, text: 'Войти' },
      { name: 'public-register', url: `${authBaseUrl}/auth/register`, text: 'Создать аккаунт' },
      { name: 'public-reset', url: `${authBaseUrl}/auth/reset`, text: 'Сброс пароля' },
    ], 'Починить public smoke');
    await registerTempUser(page);
    await closeWelcomeModalIfPresent(page);
    await openDashboardPages(page);
    await visitSurfacePages(page);
    if (runUploadFlow) {
      await createProjectAndSmokeCalculator(page);
    } else {
      await skipProjectUploadSmoke();
    }
  } catch (error) {
    logStep({ name: 'smoke-run', status: 'error', url: page.url(), detail: error.message });
    pushPlan('Разобрать падение основного smoke сценария', error.message, 'high');
    await saveScreenshot(page, 'fatal-smoke-error').catch(() => {});
  } finally {
    await cleanupAccount(context.request);
    writeArtifacts(publicHealth, consoleErrors, pageErrors);
    await browser.close();
    console.log(`Artifacts: ${artifactDir}`);
  }

  if (plan.some((item) => item.severity === 'high')) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[smoke-browser] failed:', error?.message || error);
  process.exit(1);
});
