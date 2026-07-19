import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

export type AiTextProviderName = 'groq' | 'gemini';

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-2.0-flash';
const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';

/** Resolve Groq API key (server-only, free tier friendly). */
export function getGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY?.trim() || undefined;
}

/** Resolve Gemini API key from common env names (server-only). */
export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || process.env.GOOGLE_API_KEY
    || undefined;
}

export function getActiveTextProviderName(): AiTextProviderName | null {
  if (getGroqApiKey()) return 'groq';
  if (getGeminiApiKey()) return 'gemini';
  return null;
}

export function isAiGenerationEnabled(): boolean {
  if (process.env.AI_GENERATION_ENABLED === 'false') return false;
  if (process.env.AI_GENERATION_ENABLED === 'true') return true;
  return Boolean(getGroqApiKey() || getGeminiApiKey());
}

export function getGoogleProvider() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return createGoogleGenerativeAI({ apiKey });
}

/** Prefer Groq (free) for text; fall back to Gemini when configured. */
export function getTextModel(): LanguageModel | null {
  const groqKey = getGroqApiKey();
  if (groqKey) {
    return createGroq({ apiKey: groqKey })(getTextModelId());
  }
  const google = getGoogleProvider();
  if (!google) return null;
  return google(getTextModelId());
}

export function getTextModelId(): string {
  const configured = process.env.AI_TEXT_MODEL?.trim();
  if (configured && !configured.includes('/')) {
    if (getGroqApiKey() && configured.startsWith('gemini')) {
      return DEFAULT_GROQ_MODEL;
    }
    return configured;
  }
  if (getGroqApiKey()) return DEFAULT_GROQ_MODEL;
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
  if (!getGroqApiKey() && !getGeminiApiKey()) {
    return 'أضف GROQ_API_KEY (مجاني) أو GEMINI_API_KEY في متغيرات الخادم لتفعيل المساعد.';
  }
  return 'المساعد غير متاح حالياً. حاول لاحقاً.';
}
