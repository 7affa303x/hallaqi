import { getGeminiApiKey, getImageModelId, isAiGenerationEnabled } from '../_lib/ai-provider.js';

export function GET() {
  const generationEnabled = isAiGenerationEnabled();
  const hasKey = Boolean(getGeminiApiKey());
  const imageModel = getImageModelId();

  return Response.json({
    deterministicRecommendations: true,
    optimizedScheduling: true,
    generativeAdvice: generationEnabled && hasKey,
    hairstyleImageGeneration: generationEnabled && hasKey && Boolean(imageModel),
    barberAssist: generationEnabled && hasKey,
    provider: hasKey ? 'gemini' : null,
    externalBlocker: generationEnabled && hasKey
      ? null
      : 'Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) on the server to enable generative AI.',
  }, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
