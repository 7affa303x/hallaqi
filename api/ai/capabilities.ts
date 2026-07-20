import {
  getActiveTextProviderName,
  getAiExternalBlocker,
  hasImageGeneration,
  isAiGenerationEnabled,
} from '../_lib/ai-provider.js';

export function GET() {
  const generationEnabled = isAiGenerationEnabled();
  const provider = getActiveTextProviderName();
  const hasTextProvider = Boolean(provider);
  const blocker = getAiExternalBlocker();

  return Response.json({
    deterministicRecommendations: true,
    optimizedScheduling: true,
    generativeAdvice: generationEnabled && hasTextProvider,
    hairstyleImageGeneration: hasImageGeneration(),
    barberAssist: generationEnabled && hasTextProvider,
    provider,
    externalBlocker: generationEnabled && hasTextProvider ? null : blocker,
  }, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
