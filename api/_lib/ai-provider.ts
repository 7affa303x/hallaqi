import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

export type AiTextProviderName = 'xai' | 'groq' | 'gemini';

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_XAI_MODEL = 'grok-3-latest';
const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-2.0-flash';
const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';

/**
 * Resolve xAI Grok key.
 * Prefers XAI_API_KEY; also accepts a legacy xai- key stored in GROQ_API_KEY.
 */
export function getXaiApiKey(): string | undefined {
  const explicit = process.env.XAI_API_KEY?.trim();
  if (explicit?.startsWith('xai-')) return explicit;
  const legacy = process.env.GROQ_API_KEY?.trim();
  if (legacy?.startsWith('xai-')) return legacy;
  return undefined;
}

/** Resolve Groq API key (server-only, free tier). Rejects mislabeled xAI keys. */
export function getGroqApiKey(): string | undefined {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return undefined;
  if (key.startsWith('xai-')) return undefined;
  if (!key.startsWith('gsk_')) return undefined;
  return key;
}

/** Resolve Gemini API key from common env names (server-only). */
export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || process.env.GOOGLE_API_KEY
    || undefined;
}

export function getActiveTextProviderName(): AiTextProviderName | null {
  // Prefer free Groq when a real gsk_ key is present; else xAI; else Gemini.
  if (getGroqApiKey()) return 'groq';
  if (getXaiApiKey()) return 'xai';
  if (getGeminiApiKey()) return 'gemini';
  return null;
}

/** Human-readable reason when generative AI is unavailable. */
export function getAiExternalBlocker(): string | null {
  if (!isAiGenerationEnabled()) {
    return 'AI_GENERATION_ENABLED is off on the server.';
  }
  if (getGroqApiKey() || getXaiApiKey() || getGeminiApiKey()) return null;

  const rawGroq = process.env.GROQ_API_KEY?.trim();
  if (rawGroq && !rawGroq.startsWith('gsk_') && !rawGroq.startsWith('xai-')) {
    return 'GROQ_API_KEY is not a valid Groq (gsk_…) or xAI (xai-…) key.';
  }
  return 'Set GROQ_API_KEY (gsk_…), XAI_API_KEY (xai-…), or GEMINI_API_KEY on the server.';
}

export function isAiGenerationEnabled(): boolean {
  if (process.env.AI_GENERATION_ENABLED === 'false') return false;
  if (process.env.AI_GENERATION_ENABLED === 'true') return true;
  return Boolean(getGroqApiKey() || getXaiApiKey() || getGeminiApiKey());
}

export function getGoogleProvider() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return createGoogleGenerativeAI({ apiKey });
}

/**
 * Prefer Groq (free) for text; then xAI Grok (OpenAI-compatible via Groq SDK);
 * fall back to Gemini when configured.
 *
 * Important: Groq keys (gsk_…) must hit api.groq.com (SDK default).
 * Only xAI keys use baseURL https://api.x.ai/v1 — routing gsk_ to xAI
 * makes capabilities report generativeAdvice:true while every call fails.
 */
export function getTextModel(): LanguageModel | null {
  const groqKey = getGroqApiKey();
  if (groqKey) {
    return createGroq({ apiKey: groqKey })(getTextModelId());
  }
  const xaiKey = getXaiApiKey();
  if (xaiKey) {
    return createGroq({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })(getTextModelId());
  }
  const google = getGoogleProvider();
  if (!google) return null;
  return google(getTextModelId());
}

export function getTextModelId(): string {
  const configured = process.env.AI_TEXT_MODEL?.trim();
  const provider = getActiveTextProviderName();

  if (configured && !configured.includes('/')) {
    if (provider === 'groq' && (configured.startsWith('gemini') || configured.startsWith('grok'))) {
      return DEFAULT_GROQ_MODEL;
    }
    if (provider === 'xai' && (configured.startsWith('gemini') || configured.startsWith('llama'))) {
      return DEFAULT_XAI_MODEL;
    }
    return configured;
  }
  if (provider === 'groq') return DEFAULT_GROQ_MODEL;
  if (provider === 'xai') return DEFAULT_XAI_MODEL;
  return DEFAULT_GEMINI_TEXT_MODEL;
}

export function getImageModelId(): string {
  const configured = process.env.AI_IMAGE_MODEL?.trim();
  if (!configured || configured.includes('/')) {
    return DEFAULT_GEMINI_IMAGE_MODEL;
  }
  return configured;
}

/**
 * Hairstyle image gen is opt-in (cost/quota). Requires explicit
 * AI_IMAGE_GENERATION_ENABLED=true plus a Gemini key — matches client FEATURE_FLAGS.
 */
export function hasImageGeneration(): boolean {
  if (process.env.AI_IMAGE_GENERATION_ENABLED !== 'true') return false;
  return isAiGenerationEnabled() && Boolean(getGeminiApiKey());
}

export function aiUnavailableMessage(): string {
  if (!getGroqApiKey() && !getXaiApiKey() && !getGeminiApiKey()) {
    return 'أضف GROQ_API_KEY أو XAI_API_KEY أو GEMINI_API_KEY في متغيرات الخادم لتفعيل المساعد.';
  }
  return 'المساعد غير متاح حالياً. حاول لاحقاً.';
}
