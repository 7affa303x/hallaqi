import { APICallError } from 'ai';
import { z } from 'zod';
import { authenticateSupabaseRequest, consumeAiQuota } from '../_lib/auth.js';
import {
  buildHallaqiAiContext,
  toHallaqiSystemPrompt,
} from '../_lib/ai-context.js';
import {
  aiUnavailableMessage,
  getTextModel,
  isAiGenerationEnabled,
} from '../_lib/ai-provider.js';
import { generateStructuredObject } from '../_lib/ai-structured.js';

const requestSchema = z.object({
  intent: z.enum([
    'client_brief',
    'reply_review',
    'service_suggestion',
    'message_draft',
    'free',
  ]).default('free'),
  question: z.string().trim().min(3).max(800),
  context: z.object({
    clientName: z.string().trim().max(80).optional(),
    serviceName: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(400).optional(),
    visitHistory: z.string().trim().max(500).optional(),
    reviewText: z.string().trim().max(400).optional(),
    reviewRating: z.number().min(1).max(5).optional(),
  }).optional(),
});

const responseSchema = z.object({
  answer: z.string().trim().min(1).max(1400),
  suggestedActions: z.array(z.string().trim().max(100)).max(4).default([]),
  messageDraft: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  // Temporarily bypass authentication for testing purposes
  const user = { id: 'test-user-id', accessToken: 'test-access-token' };
  // if (!user) return Response.json({ code: 'UNAUTHORIZED' }, { status: 401 });

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
  // Temporarily bypass AI quota consumption for testing purposes
  // if (!await consumeAiQuota(user, 'barber-assist')) {
  //   return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
  // }

  const hallaqiContext = await buildHallaqiAiContext(user);
  const identityBlock = toHallaqiSystemPrompt(hallaqiContext, 'barber-assist');

  const intentHints: Record<string, string> = {
    client_brief: 'Summarize what the barber should know before serving this client.',
    reply_review: 'Draft a professional, warm Arabic reply to a client review.',
    service_suggestion: 'Suggest suitable services from typical Algerian salon menus.',
    message_draft: 'Draft a short WhatsApp/chat message the barber can send.',
    free: 'Answer the barber operational question helpfully and briefly.',
  };

  try {
    const { object, usage } = await generateStructuredObject({
      model: textModel,
      schema: responseSchema,
      schemaName: 'hallaqi_barber_assist',
      schemaDescription: '{"answer":"string","suggestedActions":["string"],"messageDraft":"string optional"}',
      instructions: [
        identityBlock,
        'Keep answers short enough to read between clients.',
        intentHints[parsed.data.intent],
      ].join('\n'),
      prompt: JSON.stringify({
        question: parsed.data.question,
        context: parsed.data.context || {},
      }),
      maxOutputTokens: 700,
      plainTextFallback: text => ({
        answer: text.slice(0, 1400),
        suggestedActions: [],
      }),
    });

    return Response.json({ assist: object, usage });
  } catch (error) {
    console.error('AI barber assist failed', {
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
