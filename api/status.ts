/**
 * Launch status page — health + dependency probes for ops.
 * Visit /status (rewritten here). JSON by default; HTML when Accept includes text/html.
 */
import { getSiteUrl } from './_lib/site-url.js';

type Probe = { name: string; ok: boolean; detail: string; latencyMs: number };

async function probe(name: string, fn: () => Promise<string>): Promise<Probe> {
  const started = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, detail, latencyMs: Date.now() - started };
  } catch (err) {
    return {
      name,
      ok: false,
      detail: err instanceof Error ? err.message.slice(0, 200) : 'failed',
      latencyMs: Date.now() - started,
    };
  }
}

async function collectProbes(): Promise<Probe[]> {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  return Promise.all([
    probe('api', async () => 'process alive'),
    probe('site_url', async () => getSiteUrl()),
    probe('supabase', async () => {
      if (!supabaseUrl || !anon) throw new Error('Supabase env missing');
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      return 'reachable';
    }),
    probe('ai_keys', async () => {
      const groq = Boolean(process.env.GROQ_API_KEY?.trim());
      const google = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim());
      if (!groq && !google) throw new Error('no AI provider keys configured');
      return [groq ? 'groq' : null, google ? 'google' : null].filter(Boolean).join('+');
    }),
  ]);
}

function htmlPage(payload: {
  ok: boolean;
  version: string;
  siteUrl: string;
  ts: string;
  probes: Probe[];
}) {
  const rows = payload.probes
    .map(
      p =>
        `<tr><td>${p.name}</td><td style="color:${p.ok ? '#15803d' : '#b91c1c'}">${p.ok ? 'OK' : 'FAIL'}</td><td>${p.detail}</td><td>${p.latencyMs}ms</td></tr>`
    )
    .join('');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Hallaqi Status</title>
  <style>
    body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#0f172a;color:#e2e8f0}
    h1{margin:0 0 8px;font-size:1.4rem}
    .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;
      background:${payload.ok ? '#14532d' : '#7f1d1d'};color:#fff}
    table{width:100%;max-width:720px;border-collapse:collapse;margin-top:20px;background:#1e293b;border-radius:12px;overflow:hidden}
    th,td{padding:10px 12px;border-bottom:1px solid #334155;text-align:right;font-size:13px}
    th{background:#334155;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
    .meta{opacity:.7;font-size:12px;margin-top:8px}
  </style>
</head>
<body>
  <h1>حالة حلاقي · Hallaqi Status</h1>
  <span class="badge">${payload.ok ? 'Operational' : 'Degraded'}</span>
  <p class="meta">${payload.siteUrl} · v${payload.version} · ${payload.ts}</p>
  <table>
    <thead><tr><th>Probe</th><th>Status</th><th>Detail</th><th>Latency</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

export async function GET(request: Request) {
  const probes = await collectProbes();
  const payload = {
    ok: probes.every(p => p.ok),
    service: 'hallaqi',
    version: '12.1.0',
    siteUrl: getSiteUrl(),
    ts: new Date().toISOString(),
    probes,
  };

  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    return new Response(htmlPage(payload), {
      status: payload.ok ? 200 : 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  return Response.json(payload, {
    status: payload.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
