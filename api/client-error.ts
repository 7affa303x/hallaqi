import { z } from 'zod';

const errorSchema = z.object({
  message: z.string().max(1000),
  name: z.string().max(120).optional(),
  stack: z.string().max(4000).optional(),
  componentStack: z.string().max(4000).optional(),
  url: z.string().max(1000).optional(),
  userAgent: z.string().max(500).optional(),
});

/** Simple in-memory rate limit (per serverless isolate). */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

function allowRequest(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

function isProduction(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

export async function POST(request: Request) {
  if (!allowRequest(clientKey(request))) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12_000) return Response.json({ error: 'Payload too large' }, { status: 413 });
  const parsed = errorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid payload' }, { status: 400 });

  const payload = { ...parsed.data };
  // Scrub stacks in production — enough for triage without leaking internals.
  if (isProduction()) {
    delete payload.stack;
    delete payload.componentStack;
  }

  const requestId = crypto.randomUUID();
  console.error(JSON.stringify({
    event: 'client_error',
    requestId,
    occurredAt: new Date().toISOString(),
    ...payload,
  }));
  return Response.json({ accepted: true, requestId }, { status: 202 });
}
