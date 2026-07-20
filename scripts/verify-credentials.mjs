#!/usr/bin/env node
/**
 * Verifies Supabase + Gemini credentials from environment variables.
 * Usage: node scripts/verify-credentials.mjs
 * Never commit real keys — load from .env or CI secrets only.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const groqKey = process.env.GROQ_API_KEY;

const results = [];

async function check(name, ok, detail) {
  results.push({ name, ok, detail });
  const icon = ok ? '✓' : '✗';
  console.log(`${icon} ${name}: ${detail}`);
}

async function supabaseTable(table, key) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.status;
}

async function main() {
  console.log('=== Hallaqi credential verification ===\n');

  if (!supabaseUrl || supabaseUrl.includes('your-project')) {
    await check('Supabase URL', false, 'VITE_SUPABASE_URL not set or still placeholder');
  } else {
    await check('Supabase URL', true, supabaseUrl);
  }

  if (!anonKey || anonKey.includes('your_')) {
    await check('Supabase anon key', false, 'VITE_SUPABASE_ANON_KEY not set');
  } else {
    const status = await supabaseTable('profiles', anonKey);
    await check('Supabase anon key', status === 200, `profiles → HTTP ${status}`);
  }

  if (serviceKey) {
    const status = await supabaseTable('profiles', serviceKey);
    await check('Supabase service key', status === 200, `profiles → HTTP ${status}`);
  }

  if (anonKey && supabaseUrl) {
    const sellersRes = await fetch(`${supabaseUrl}/rest/v1/marketplace_sellers?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    const productsRes = await fetch(`${supabaseUrl}/rest/v1/marketplace_products?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    const sellersOk = sellersRes.status === 200;
    const productsOk = productsRes.status === 200;
    await check(
      'Marketplace schema',
      sellersOk && productsOk,
      sellersOk && productsOk
        ? 'marketplace_sellers + products OK'
        : `sellers HTTP ${sellersRes.status}, products HTTP ${productsRes.status}`,
    );
  }

  if (!groqKey && !geminiKey) {
    await check('AI text provider', false, 'Set GROQ_API_KEY (gsk_…), XAI_API_KEY (xai-…), or GEMINI_API_KEY');
  } else if (groqKey?.startsWith('xai-') || process.env.XAI_API_KEY?.startsWith('xai-')) {
    const xaiKey = process.env.XAI_API_KEY?.startsWith('xai-') ? process.env.XAI_API_KEY : groqKey;
    const genRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_TEXT_MODEL?.startsWith('grok') ? process.env.AI_TEXT_MODEL : 'grok-3-latest',
        messages: [{ role: 'user', content: 'قل مرحبا' }],
        max_tokens: 10,
      }),
    });
    await check(
      'xAI Grok API',
      genRes.status === 200,
      genRes.status === 200 ? 'chat OK' : `HTTP ${genRes.status}`,
    );
  } else if (groqKey) {
    const genRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'قل مرحبا' }],
        max_tokens: 10,
      }),
    });
    await check(
      'Groq API (free text AI)',
      genRes.status === 200,
      genRes.status === 200 ? 'generateContent OK' : `HTTP ${genRes.status}`,
    );
  } else {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
    );
    const listOk = listRes.ok;
    let genDetail = listOk ? 'key valid (models listed)' : `list models HTTP ${listRes.status}`;
    if (listOk) {
      const genRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] }),
        },
      );
      if (genRes.status === 200) genDetail += ' + generateContent OK';
      else if (genRes.status === 429) genDetail += ' + generateContent QUOTA EXCEEDED (enable billing or wait)';
      else genDetail += ` + generateContent HTTP ${genRes.status}`;
    }
    await check('Gemini API key', listOk, genDetail);
  }

  const optional = [
    ['VITE_STRIPE_PUBLISHABLE_KEY', process.env.VITE_STRIPE_PUBLISHABLE_KEY],
    ['VITE_CCP_ACCOUNT_NUMBER', process.env.VITE_CCP_ACCOUNT_NUMBER],
    ['VITE_VAPID_PUBLIC_KEY', process.env.VITE_VAPID_PUBLIC_KEY],
  ];
  console.log('\nOptional (not required for core launch):');
  for (const [name, val] of optional) {
    await check(name, Boolean(val?.trim()), val?.trim() ? 'set' : 'missing');
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${failed === 0 ? 'All critical checks passed.' : `${failed} check(s) need attention.`}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
