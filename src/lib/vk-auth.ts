import { normalizeEmail } from '@/lib/auth-identifiers';

const VK_API_VERSION = '5.199';
const VK_OAUTH_AUTHORIZE_URL = 'https://oauth.vk.com/authorize';
const VK_OAUTH_TOKEN_URL = 'https://oauth.vk.com/access_token';
const VK_API_URL = 'https://api.vk.com/method';

export type VkResolvedIdentity = {
  vkId: string;
  email: string;
  displayName: string;
  vkUsername: string;
  vkPhotoUrl: string | null;
};

export function getVkAuthEmailDomain(): string {
  return process.env.VK_AUTH_EMAIL_DOMAIN?.trim() || 'vk.local';
}

export function buildVkSyntheticEmail(vkId: number | string): string {
  return normalizeEmail(`vk-${vkId}@${getVkAuthEmailDomain()}`);
}

export function resolveVkIdentity(profile: Record<string, any>, account?: Record<string, any>): VkResolvedIdentity {
  const vkProfile = Array.isArray(profile?.response) ? profile.response[0] || {} : profile || {};
  const vkId = account?.providerAccountId ? String(account.providerAccountId) : String(vkProfile?.id || '');
  if (!vkId) {
    throw new Error('VK account did not return an id.');
  }

  const email = normalizeEmail(account?.email || profile?.email || buildVkSyntheticEmail(vkId));
  const displayName =
    [vkProfile?.first_name, vkProfile?.last_name].filter((value) => typeof value === 'string' && value.trim()).join(' ').trim() ||
    vkProfile?.screen_name ||
    `VK ${vkId}`;
  const vkUsername = typeof vkProfile?.screen_name === 'string' ? vkProfile.screen_name : '';
  const vkPhotoUrl = typeof vkProfile?.photo_100 === 'string' ? vkProfile.photo_100 : null;

  return {
    vkId,
    email,
    displayName,
    vkUsername,
    vkPhotoUrl,
  };
}

export function buildVkAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(VK_OAUTH_AUTHORIZE_URL);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'email');
  url.searchParams.set('v', VK_API_VERSION);
  url.searchParams.set('state', params.state);
  return url.toString();
}

export async function exchangeVkCode(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<Record<string, any>> {
  const tokenUrl = new URL(VK_OAUTH_TOKEN_URL);
  tokenUrl.searchParams.set('client_id', params.clientId);
  tokenUrl.searchParams.set('client_secret', params.clientSecret);
  tokenUrl.searchParams.set('redirect_uri', params.redirectUri);
  tokenUrl.searchParams.set('code', params.code);
  tokenUrl.searchParams.set('v', VK_API_VERSION);

  const response = await fetch(tokenUrl.toString(), { method: 'GET' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error_description || payload?.error || 'VK token exchange failed.');
  }
  return payload;
}

export async function fetchVkUserProfile(params: {
  accessToken: string;
  userId?: string | number;
}): Promise<Record<string, any>> {
  const url = new URL(`${VK_API_URL}/users.get`);
  url.searchParams.set('fields', 'photo_100,screen_name');
  url.searchParams.set('v', VK_API_VERSION);
  url.searchParams.set('access_token', params.accessToken);
  if (params.userId) {
    url.searchParams.set('user_ids', String(params.userId));
  }

  const response = await fetch(url.toString(), { method: 'GET' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.error_msg || 'VK users.get failed.');
  }
  return payload;
}

export function getVkApiVersion(): string {
  return VK_API_VERSION;
}
