import { APICallError, generateText, Output } from 'ai';
import { z } from 'zod';
import { authenticateSupabaseRequest, consumeAiQuota } from '../_lib/auth.js';
import {
  aiUnavailableMessage,
  getGoogleProvider,
  getTextModelId,
  isAiGenerationEnabled,
} from '../_lib/ai-provider.js';

const requestSchema = z.object({
  question: z.string().trim().min(5).max(500),
  hairType: z.string().trim().max(80).optional(),
  desiredStyle: z.string().trim().max(120).optional(),
});

const responseSchema = z.object({
  answer: z.string().min(1).max(1200),
  suggestedServices: z.array(z.string().max(80)).max(4),
  cautions: z.array(z.string().max(160)).max(4),
});

export async function POST(request: Request) {
  const user = await authenticateSupabaseRequest(request);
  if (!user) return Response.json({ code: 'UNAUTHORIZED' }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ code: 'INVALID_INPUT' }, { status: 400 });
  }

  const google = getGoogleProvider();
  if (!isAiGenerationEnabled() || !google) {
    return Response.json({
      code: 'AI_NOT_CONFIGURED',
      message: aiUnavailableMessage(),
    }, { status: 503 });
  }
  if (!await consumeAiQuota(user, 'advice')) {
    return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
  }

  try {
    const { output, usage } = await generateText({
      model: google(getTextModelId()),
      instructions: [
        'You are Hallaqi, a concise Algerian barbering and grooming advisor.',
        'Answer in Arabic (Algerian dialect welcome when natural). Give practical, conservative advice.',
        'Do not diagnose medical conditions. Recommend a clinician for scalp disease, injury, or unexplained hair loss.',
        'Never claim certainty about a style without an in-person consultation.',
      ].join(' '),
      prompt: JSON.stringify(parsed.data),
      output: Output.object({
        name: 'hallaqi_grooming_advice',
        description: 'Safe Arabic grooming advice and matching salon services.',
        schema: responseSchema,
      }),
      maxOutputTokens: 600,
    });

    return Response.json({ advice: output, usage });
  } catch (error) {
    console.error('AI advice generation failed', {
      userId: user.id,
      statusCode: APICallError.isInstance(error) ? error.statusCode : undefined,
    });
    if (APICallError.isInstance(error) && error.statusCode === 429) {
      return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
    }
    return Response.json({ code: 'AI_UNAVAILABLE' }, { status: 503 });
  }
}
