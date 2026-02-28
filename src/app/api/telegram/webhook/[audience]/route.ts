import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramWebhookUpdate, TELEGRAM_AUDIENCES, verifyTelegramWebhookSecret, type TelegramAudience } from '@/server-functions/webhooks/telegram';

function isAudience(value: string): value is TelegramAudience {
  return (TELEGRAM_AUDIENCES as readonly string[]).includes(value);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { audience: string } }
) {
  try {
    const audience = params.audience;
    if (!isAudience(audience)) {
      return NextResponse.json({ ok: false, error: 'Unknown audience' }, { status: 404 });
    }

    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
    const isValid = await verifyTelegramWebhookSecret(secretHeader, audience);
    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Invalid secret token' }, { status: 401 });
    }

    const update = await request.json();
    await handleTelegramWebhookUpdate(update, audience);
    return NextResponse.json({ ok: true, audience });
  } catch (error: any) {
    console.error('[telegram/webhook/audience] error', error);
    return NextResponse.json({ ok: false, error: 'Webhook handler failed' }, { status: 500 });
  }
}
