#!/usr/bin/env node

const domains = (process.env.SMOKE_DOMAINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

if (!domains.length) {
  console.error('SMOKE_DOMAINS is not set. Refusing to run an empty smoke-subdomains check.');
  process.exit(1);
}

async function check(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response;
  try {
    response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const ok = response.status >= 200 && response.status < 300;
  if (!ok) {
    const location = response.headers.get('location');
    throw new Error(`${url} -> ${response.status}${location ? ` location=${location}` : ''}`);
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
