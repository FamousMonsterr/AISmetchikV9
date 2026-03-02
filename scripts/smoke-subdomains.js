#!/usr/bin/env node

const domains = (process.env.SMOKE_DOMAINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

if (!domains.length) {
  console.log('SMOKE_DOMAINS is not set, skipping smoke-subdomains.');
  process.exit(0);
}

async function check(url) {
  const response = await fetch(url, { redirect: 'manual' });
  const ok = response.status >= 200 && response.status < 400;
  if (!ok) {
    throw new Error(`${url} -> ${response.status}`);
  }
  console.log(`[ok] ${url} -> ${response.status}`);
}

async function main() {
  for (const domain of domains) {
    const normalized = domain.startsWith('http') ? domain : `https://${domain}`;
    await check(`${normalized}/api/healthz`);
  }
}

main().catch((error) => {
  console.error('[smoke-subdomains] failed:', error?.message || error);
  process.exit(1);
});
