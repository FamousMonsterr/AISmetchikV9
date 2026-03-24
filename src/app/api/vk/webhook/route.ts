import { NextResponse } from 'next/server';
import { handleVkWebhookEvent, verifyVkWebhookSecret } from '@/server-functions/webhooks/vk';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid VK webhook payload.' }, { status: 400 });
  }

  const isValid = await verifyVkWebhookSecret(payload as Record<string, any>);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid VK secret.' }, { status: 403 });
  }

  const result = await handleVkWebhookEvent(payload as Record<string, any>);
  return new NextResponse(result.body, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
