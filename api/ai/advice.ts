import { APICallError, generateText, Output } from 'ai';
import { z } from 'zod';
import { authenticateSupabaseRequest, consumeAiQuota } from '../_lib/auth.js';

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

  if (process.env.AI_GENERATION_ENABLED !== 'true') {
    return Response.json({
      code: 'AI_NOT_CONFIGURED',
      message: 'Generative advice is temporarily unavailable.',
    }, { status: 503 });
  }
  if (!await consumeAiQuota(user, 'advice')) {
    return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
  }

  try {
    const { output, usage } = await generateText({
      model: process.env.AI_TEXT_MODEL || 'openai/gpt-5.4',
      instructions: [
        'You are Hallaqi, a concise Algerian barbering and grooming advisor.',
        'Answer in Arabic. Give practical, conservative advice.',
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
      providerOptions: {
        gateway: {
          user: user.id,
          tags: ['feature:grooming-advice', 'product:hallaqi'],
        },
      },
    });

    return Response.json({ advice: output, usage });
  } catch (error) {
    console.error('AI advice generation failed', {
      userId: user.id,
      statusCode: APICallError.isInstance(error) ? error.statusCode : undefined,
    });
    if (APICallError.isInstance(error)) {
      if (error.statusCode === 402) return Response.json({ code: 'AI_BUDGET_EXCEEDED' }, { status: 503 });
      if (error.statusCode === 429) return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
    }
    return Response.json({ code: 'AI_UNAVAILABLE' }, { status: 503 });
  }
}
