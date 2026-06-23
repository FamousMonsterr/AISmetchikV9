// src/app/api/ai-config/route.ts
// Возвращает ai-config.json для клиентских компонентов

import { NextResponse } from 'next/server';
import { readAiConfig } from '@/lib/ai-config-runtime';

export async function GET() {
  try {
    const config = await readAiConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
