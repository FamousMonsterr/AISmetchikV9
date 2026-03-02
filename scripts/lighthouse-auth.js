#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('@playwright/test');

const baseUrl = process.env.LH_BASE_URL || process.env.E2E_BASE_URL || 'https://aismetchik.ru';
const targetPaths = ['/dashboard/billing', '/dashboard/price-base'];

const artifactDir = path.resolve(process.cwd(), '.artifacts', 'lighthouse-auth');
const npmCacheDir = path.resolve(process.cwd(), '.npm-cache');
const headersPath = path.join(artifactDir, 'headers.json');

const envEmail = process.env.LH_USER_EMAIL || process.env.E2E_USER_EMAIL;
const envPassword = process.env.LH_USER_PASSWORD || process.env.E2E_USER_PASSWORD;

function toMetric(audits, id) {
  return audits?.[id]?.displayValue || audits?.[id]?.numericValue || 'n/a';
}

function runLighthouse(url, outputPath, desktop, chromePath) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const args = [
      '--yes',
      'lighthouse',
      url,
      '--output=json',
      `--output-path=${outputPath}`,
      '--quiet',
      '--chrome-flags=--headless',
      '--chrome-flags=--no-sandbox',
      `--extra-headers=${headersPath}`,
    ];
    if (desktop) args.push('--preset=desktop');

    const result = spawnSync('npx', args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        CHROME_PATH: chromePath,
        npm_config_cache: npmCacheDir,
      },
    });

    if (result.status === 0) {
      return;
    }
    if (attempt < 3) {
      console.log(`[lh] retry ${attempt}/2 for ${desktop ? 'desktop' : 'mobile'} ${url}`);
    } else {
      throw new Error(`Lighthouse failed (${desktop ? 'desktop' : 'mobile'}) for ${url}`);
    }
  }
}

async function loginOrRegister(page) {
  if (envEmail && envPassword) {
    console.log(`[auth] using existing account: ${envEmail}`);
    await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.fill('#login-email', envEmail);
    await page.fill('#login-password', envPassword);
    await Promise.all([
      page.waitForURL('**/dashboard**', { timeout: 60_000 }),
      page.click('button[type="submit"]'),
    ]);
    return { temp: false, email: envEmail, password: envPassword };
  }

  const stamp = Date.now();
  const email = `lh_${stamp}@example.com`;
  const password = `Lh!${stamp}A`;
  const phone = '+79990000000';
  console.log(`[auth] no credentials provided, creating temp account: ${email}`);

  await page.goto(`${baseUrl}/auth/register`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.fill('#register-email', email);
  await page.fill('#register-phone', phone);
  await page.fill('#register-password', password);
  await page.click('#privacy');
  await page.click('#terms');

  await Promise.all([
    page.waitForURL('**/dashboard**', { timeout: 90_000 }),
    page.click('button[type="submit"]'),
  ]);
  return { temp: true, email, password };
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.mkdirSync(npmCacheDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  let authInfo = null;

  try {
    authInfo = await loginOrRegister(page);

    const cookies = await context.cookies(baseUrl);
    if (!cookies.length) {
      throw new Error('No auth cookies captured after login.');
    }

    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    fs.writeFileSync(headersPath, JSON.stringify({ Cookie: cookieHeader }, null, 2), 'utf8');

    const chromePath = process.env.CHROME_PATH || chromium.executablePath();
    const summaries = [];

    for (const routePath of targetPaths) {
      const routeName = routePath.replace(/\//g, '-').replace(/^-/, '');
      const fullUrl = `${baseUrl}${routePath}`;
      const mobilePath = path.join(artifactDir, `${routeName}-mobile.json`);
      const desktopPath = path.join(artifactDir, `${routeName}-desktop.json`);

      console.log(`[lh] mobile: ${fullUrl}`);
      runLighthouse(fullUrl, mobilePath, false, chromePath);
      console.log(`[lh] desktop: ${fullUrl}`);
      runLighthouse(fullUrl, desktopPath, true, chromePath);

      for (const [label, reportPath] of [
        ['mobile', mobilePath],
        ['desktop', desktopPath],
      ]) {
        const lhr = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        summaries.push({
          route: routePath,
          profile: label,
          score: Math.round((lhr.categories?.performance?.score || 0) * 100),
          fcp: toMetric(lhr.audits, 'first-contentful-paint'),
          lcp: toMetric(lhr.audits, 'largest-contentful-paint'),
          si: toMetric(lhr.audits, 'speed-index'),
          tbt: toMetric(lhr.audits, 'total-blocking-time'),
          inp: toMetric(lhr.audits, 'interaction-to-next-paint'),
          finalUrl: lhr.finalDisplayedUrl,
        });
      }
    }

    console.log('\n=== Authenticated Lighthouse Summary ===');
    for (const item of summaries) {
      console.log(
        `${item.route} [${item.profile}] score=${item.score} FCP=${item.fcp} LCP=${item.lcp} SI=${item.si} TBT=${item.tbt} INP=${item.inp} url=${item.finalUrl}`
      );
    }
    console.log(`\nReports saved to: ${artifactDir}`);
  } finally {
    if (authInfo?.temp) {
      try {
        const loginResp = await context.request.post(`${baseUrl}/api/v1/auth/login`, {
          data: { email: authInfo.email, password: authInfo.password },
        });
        if (loginResp.ok()) {
          const loginJson = await loginResp.json();
          const token = loginJson?.accessToken;
          if (token) {
            const deleteResp = await context.request.delete(`${baseUrl}/api/v1/auth/account`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (deleteResp.ok()) {
              console.log(`[auth] temp account deleted: ${authInfo.email}`);
            } else {
              console.warn(`[auth] temp account delete failed: ${authInfo.email}`);
            }
          }
        }
      } catch (cleanupError) {
        console.warn('[auth] cleanup failed:', cleanupError?.message || cleanupError);
      }
    }
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[lighthouse-auth] failed:', error?.message || error);
  process.exit(1);
});
