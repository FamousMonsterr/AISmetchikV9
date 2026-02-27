import { NextRequest, NextResponse } from 'next/server';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function pruneExpiredBuckets(now = Date.now()) {
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function clientIpFromRequest(request: NextRequest): string {
  const fromForwarded = request.headers.get('x-forwarded-for');
  if (fromForwarded) {
    return fromForwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown-ip';
}

export function consumeRateLimit(input: {
  scope: string;
  key: string;
  max: number;
  windowMs: number;
}): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const compositeKey = `${input.scope}:${input.key}`;
  const bucket = buckets.get(compositeKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(compositeKey, {
      count: 1,
      resetAt: now + input.windowMs,
    });
    return { ok: true, remaining: input.max - 1 };
  }

  if (bucket.count >= input.max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  buckets.set(compositeKey, bucket);
  return { ok: true, remaining: Math.max(0, input.max - bucket.count) };
}

export function enforceRateLimit(input: {
  request: NextRequest;
  scope: string;
  userId?: string;
  max: number;
  windowMs: number;
}): NextResponse | null {
  const limiterKey = input.userId || clientIpFromRequest(input.request);
  const result = consumeRateLimit({
    scope: input.scope,
    key: limiterKey,
    max: input.max,
    windowMs: input.windowMs,
  });

  if (result.ok) return null;

  return NextResponse.json(
    {
      error: `Слишком много запросов. Повторите через ${result.retryAfterSec} сек.`,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSec),
      },
    }
  );
}
