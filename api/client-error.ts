import { z } from 'zod';

const errorSchema = z.object({
  message: z.string().max(1000),
  name: z.string().max(120).optional(),
  stack: z.string().max(4000).optional(),
  componentStack: z.string().max(4000).optional(),
  url: z.string().max(1000).optional(),
  userAgent: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12_000) return Response.json({ error: 'Payload too large' }, { status: 413 });
  const parsed = errorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid payload' }, { status: 400 });
  const requestId = crypto.randomUUID();
  console.error(JSON.stringify({
    event: 'client_error',
    requestId,
    occurredAt: new Date().toISOString(),
    ...parsed.data,
  }));
  return Response.json({ accepted: true, requestId }, { status: 202 });
}
