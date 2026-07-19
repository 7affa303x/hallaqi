import { afterEach, vi } from 'vitest';
import { POST as advicePost } from '../../api/ai/advice';
import { POST as listingAssistPost } from '../../api/ai/listing-assist';
import { GET as capabilitiesGet } from '../../api/ai/capabilities';

describe('AI API contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.AI_GENERATION_ENABLED;
    delete process.env.AI_IMAGE_GENERATION_ENABLED;
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  });

  it('keeps deterministic intelligence available when generation is disabled', async () => {
    process.env.AI_GENERATION_ENABLED = 'false';
    const body = await capabilitiesGet().json();
    expect(body).toEqual(expect.objectContaining({
      deterministicRecommendations: true,
      optimizedScheduling: true,
      generativeAdvice: false,
      hairstyleImageGeneration: false,
    }));
  });

  it('reports groq provider when a server key is present', async () => {
    process.env.AI_GENERATION_ENABLED = 'true';
    process.env.GROQ_API_KEY = 'test-key';
    const body = await capabilitiesGet().json();
    expect(body).toEqual(expect.objectContaining({
      generativeAdvice: true,
      barberAssist: true,
      provider: 'groq',
      hairstyleImageGeneration: false,
      externalBlocker: null,
    }));
  });

  it('reports gemini provider when a server key is present', async () => {
    process.env.AI_GENERATION_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-key';
    const body = await capabilitiesGet().json();
    expect(body).toEqual(expect.objectContaining({
      generativeAdvice: true,
      barberAssist: true,
      provider: 'gemini',
      hairstyleImageGeneration: false,
      externalBlocker: null,
    }));
  });

  it('keeps image generation off unless AI_IMAGE_GENERATION_ENABLED=true', async () => {
    process.env.AI_GENERATION_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.AI_IMAGE_GENERATION_ENABLED = 'true';
    const body = await capabilitiesGet().json();
    expect(body.hairstyleImageGeneration).toBe(true);
  });

  it('returns a typed external blocker after authenticating the user', async () => {
    process.env.AI_GENERATION_ENABLED = 'false';
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'public-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ id: 'user-1', email: 'user@example.com' })
    ));

    const response = await advicePost(new Request('https://hallaqi.app/api/ai/advice', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'ما الخدمة المناسبة لشعر مجعد؟' }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      code: 'AI_NOT_CONFIGURED',
    }));
  });

  it('rejects unauthenticated listing-assist calls', async () => {
    const response = await listingAssistPost(new Request('https://hallaqi.app/api/ai/listing-assist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tool: 'title', prompt: 'زيت لحية' }),
    }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ code: 'UNAUTHORIZED' });
  });
});
