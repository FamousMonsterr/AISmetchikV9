// src/app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramWebhookUpdate, verifyTelegramWebhookSecret } from '@/server-functions/webhooks/telegram';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 100 requests per IP per minute
  const rateLimitResponse = enforceRateLimit({
    request,
    scope: 'telegram:webhook',
    max: 100,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
    const isValid = await verifyTelegramWebhookSecret(secretHeader, 'default');
    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Invalid secret token' }, { status: 401 });
    }

    const update = await request.json();
    await handleTelegramWebhookUpdate(update, 'default');
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[telegram/webhook] error', error);
    return NextResponse.json({ ok: false, error: 'Webhook handler failed' }, { status: 500 });
  }
}
