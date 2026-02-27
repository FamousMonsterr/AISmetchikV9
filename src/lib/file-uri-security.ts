import { getEnvSettings } from '@/actions/adminActions';

function readHost(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    return parsed.host.toLowerCase();
  } catch {
    return null;
  }
}

async function getAllowedHosts(): Promise<Set<string>> {
  const settings = await getEnvSettings({ allowInternal: true });
  const hosts = new Set<string>();

  const endpointHost = readHost(settings.s3Endpoint);
  if (endpointHost) hosts.add(endpointHost);

  const presetHosts = (settings.s3Presets || [])
    .map((preset) => readHost(preset?.config?.s3Endpoint))
    .filter(Boolean) as string[];
  for (const host of presetHosts) hosts.add(host);

  const publicSiteHost = readHost(process.env.NEXT_PUBLIC_SITE_URL);
  if (publicSiteHost) hosts.add(publicSiteHost);

  if (process.env.NODE_ENV !== 'production') {
    hosts.add('localhost');
    hosts.add('127.0.0.1');
    hosts.add('[::1]');
  }

  return hosts;
}

export async function validateFileUriAgainstAllowlist(fileUri: string): Promise<{
  ok: boolean;
  reason?: string;
  host?: string;
  allowedHosts?: string[];
}> {
  let parsed: URL;
  try {
    parsed = new URL(fileUri);
  } catch {
    return { ok: false, reason: 'Некорректный fileUri.' };
  }

  const protocol = parsed.protocol.toLowerCase();
  const isLocalHttp = (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && protocol === 'http:';
  if (protocol !== 'https:' && !isLocalHttp) {
    return { ok: false, reason: 'Разрешены только HTTPS URL (или localhost HTTP для dev).' };
  }

  const host = parsed.host.toLowerCase();
  const allowedHosts = await getAllowedHosts();
  if (!allowedHosts.size) {
    return {
      ok: false,
      reason: 'Allowlist для fileUri не настроен.',
      host,
      allowedHosts: [],
    };
  }

  if (!allowedHosts.has(host)) {
    return {
      ok: false,
      reason: 'Хост fileUri не входит в allowlist.',
      host,
      allowedHosts: Array.from(allowedHosts),
    };
  }

  return { ok: true, host };
}
