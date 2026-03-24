import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { linkVkAccountToUser } from '@/lib/account-links';
import { exchangeVkCode, fetchVkUserProfile, resolveVkIdentity } from '@/lib/vk-auth';

type PopupPayload = {
  success: boolean;
  message: string;
  vkId?: string;
  vkUsername?: string;
  vkPhotoUrl?: string | null;
};

const popupResponse = (payload: PopupPayload) => {
  const serialized = JSON.stringify({ type: 'vk-link', ...payload });
  const html = `<!doctype html>
<html lang="ru">
  <head><meta charset="utf-8" /><title>VK Link</title></head>
  <body>
    <script>
      try {
        if (window.opener) {
          window.opener.postMessage(${serialized}, window.location.origin);
        }
      } catch (e) {}
      window.close();
    </script>
    <p>${payload.message}</p>
  </body>
</html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const error = url.searchParams.get('error');

  if (error) {
    return popupResponse({ success: false, message: `VK вернул ошибку: ${error}` });
  }
  if (!code || !state) {
    return popupResponse({ success: false, message: 'VK callback is incomplete.' });
  }

  const db = await getDb();
  const stateCollection = db.collection<any>('auth_link_states');
  const stateDoc = await stateCollection.findOne({ _id: state, provider: 'vk' });
  if (!stateDoc || !stateDoc.userId) {
    return popupResponse({ success: false, message: 'VK link state is invalid or expired.' });
  }
  if (stateDoc.expiresAt && new Date(stateDoc.expiresAt).getTime() < Date.now()) {
    await stateCollection.deleteOne({ _id: state });
    return popupResponse({ success: false, message: 'VK link state expired.' });
  }

  try {
    const clientId = process.env.VK_ID_CLIENT_ID?.trim();
    const clientSecret = process.env.VK_ID_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret || !stateDoc.redirectUri) {
      throw new Error('VK auth is not configured.');
    }

    const tokenPayload = await exchangeVkCode({
      clientId,
      clientSecret,
      redirectUri: stateDoc.redirectUri,
      code,
    });
    const profile = await fetchVkUserProfile({
      accessToken: tokenPayload.access_token,
      userId: tokenPayload.user_id,
    });
    const identity = resolveVkIdentity(profile, {
      providerAccountId: tokenPayload.user_id,
      email: tokenPayload.email,
    });

    await linkVkAccountToUser(stateDoc.userId, identity);
    await stateCollection.deleteOne({ _id: state });

    return popupResponse({
      success: true,
      message: 'VK успешно привязан.',
      vkId: identity.vkId,
      vkUsername: identity.vkUsername,
      vkPhotoUrl: identity.vkPhotoUrl,
    });
  } catch (callbackError: any) {
    console.error('VK link callback failed:', callbackError);
    await stateCollection.deleteOne({ _id: state }).catch(() => null);
    return popupResponse({ success: false, message: callbackError?.message || 'Не удалось привязать VK.' });
  }
}
