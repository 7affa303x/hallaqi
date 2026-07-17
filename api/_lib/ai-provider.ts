import { createGoogleGenerativeAI } from '@ai-sdk/google';

/** Resolve Gemini API key from common env names (server-only). */
export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || process.env.GOOGLE_API_KEY
    || undefined;
}

export function isAiGenerationEnabled(): boolean {
  if (process.env.AI_GENERATION_ENABLED === 'false') return false;
  if (process.env.AI_GENERATION_ENABLED === 'true') return true;
  // Auto-enable when a Gemini key is present so preview/local deploys work.
  return Boolean(getGeminiApiKey());
}

export function getGoogleProvider() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return createGoogleGenerativeAI({ apiKey });
}

export function getTextModelId(): string {
  const configured = process.env.AI_TEXT_MODEL?.trim();
  // Prefer direct Gemini ids; map legacy Gateway ids to Gemini Flash.
  if (!configured || configured.includes('/')) {
    return 'gemini-2.0-flash';
  }
  return configured;
}

export function getImageModelId(): string {
  const configured = process.env.AI_IMAGE_MODEL?.trim();
  if (!configured || configured.includes('/')) {
    return 'gemini-2.0-flash-preview-image-generation';
  }
  return configured;
}

export function aiUnavailableMessage(): string {
  if (!getGeminiApiKey()) {
    return 'أضف GEMINI_API_KEY في متغيرات الخادم لتفعيل المساعد.';
  }
  return 'المساعد غير متاح حالياً. حاول لاحقاً.';
}
