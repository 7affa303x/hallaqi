import { APICallError } from 'ai';
import { z } from 'zod';
import { authenticateSupabaseRequest, consumeAiQuota } from '../_lib/auth.js';
import {
  buildHallaqiAiContext,
  toHallaqiSystemPrompt,
  type ClientSiteContext,
} from '../_lib/ai-context.js';
import {
  aiUnavailableMessage,
  getTextModel,
  isAiGenerationEnabled,
} from '../_lib/ai-provider.js';
import { generateStructuredObject } from '../_lib/ai-structured.js';

const clientBarberHintSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  city: z.string().trim().max(80).optional(),
  rating: z.number().min(0).max(5).optional(),
  services: z.array(z.string().trim().max(80)).max(6).optional(),
  reasons: z.array(z.string().trim().max(120)).max(4).optional(),
});

const clientSiteContextSchema = z.object({
  wilaya: z.string().trim().max(80).optional(),
  preferredCategory: z.string().trim().max(40).optional(),
  topBarbers: z.array(clientBarberHintSchema).max(6).optional(),
  recentBarberNames: z.array(z.string().trim().max(120)).max(6).optional(),
}).optional();

const requestSchema = z.object({
  question: z.string().trim().min(5).max(500),
  hairType: z.string().trim().max(80).optional(),
  desiredStyle: z.string().trim().max(120).optional(),
  siteContext: clientSiteContextSchema,
});

const responseSchema = z.object({
  answer: z.string().trim().min(1).max(1400),
  suggestedServices: z.array(z.string().trim().max(80)).max(4).default([]),
  cautions: z.array(z.string().trim().max(160)).max(4).default([]),
});

export async function POST(request: Request) {
  const user = await authenticateSupabaseRequest(request);
  if (!user) return Response.json({ code: 'UNAUTHORIZED' }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ code: 'INVALID_INPUT' }, { status: 400 });
  }

  const textModel = getTextModel();
  if (!isAiGenerationEnabled() || !textModel) {
    return Response.json({
      code: 'AI_NOT_CONFIGURED',
      message: aiUnavailableMessage(),
    }, { status: 503 });
  }
  if (!await consumeAiQuota(user, 'advice')) {
    return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
  }

  const siteContext = parsed.data.siteContext as ClientSiteContext | undefined;
  const hallaqiContext = await buildHallaqiAiContext(user, siteContext);
  const identityBlock = toHallaqiSystemPrompt(hallaqiContext, 'advice');

  try {
    const { object, usage } = await generateStructuredObject({
      model: textModel,
      schema: responseSchema,
      schemaName: 'hallaqi_grooming_advice',
      schemaDescription: '{"answer":"string","suggestedServices":["string"],"cautions":["string"]}',
      instructions: [
        identityBlock,
        'Primary mode: practical grooming advice grounded in Hallaqi context above.',
        'When relevant, suggest booking via تبويب الحجز or name a barber from the catalog list.',
        'Off-topic questions (sports, news, trivia, jokes, general knowledge): NEVER refuse or say the question is outside grooming.',
        'Instead answer in 1–2 Arabic sentences: real fact + mandatory witty barber/salon/Hallaqi metaphor (not a dry fact alone).',
        'Example tone: "من ربح كأس العالم؟ → اللي خرج من الصالون بقصة بطولية… الأرجنتين!" (keep the true answer clear).',
        'Do NOT end with a lecture that you only do grooming; stay playful and helpful.',
        'suggestedServices: up to 4 short salon service names in Arabic when the question is grooming-related; otherwise [] or one playful related service max.',
        'cautions: up to 4 short safety notes in Arabic when relevant; for playful off-topic answers use [] or one light wink note.',
      ].join('\n'),
      prompt: JSON.stringify({
        question: parsed.data.question,
        hairType: parsed.data.hairType,
        desiredStyle: parsed.data.desiredStyle,
      }),
      maxOutputTokens: 700,
      plainTextFallback: text => ({
        answer: text.slice(0, 1200),
        suggestedServices: [],
        cautions: ['هذه نصيحة عامة — راجع حلاقاً أو مختصاً عند الحاجة.'],
      }),
    });

    return Response.json({ advice: object, usage });
  } catch (error) {
    console.error('AI advice generation failed', {
      userId: user.id,
      statusCode: APICallError.isInstance(error) ? error.statusCode : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
    if (APICallError.isInstance(error) && error.statusCode === 429) {
      return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
    }
    return Response.json({ code: 'AI_UNAVAILABLE' }, { status: 503 });
  }
}
