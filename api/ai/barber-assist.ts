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
  answer: z.string().min(1).max(1400),
  suggestedActions: z.array(z.string().max(100)).max(4),
  messageDraft: z.string().max(500).optional(),
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
  if (!await consumeAiQuota(user, 'barber-assist')) {
    return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
  }

  const intentHints: Record<string, string> = {
    client_brief: 'Summarize what the barber should know before serving this client.',
    reply_review: 'Draft a professional, warm Arabic reply to a client review.',
    service_suggestion: 'Suggest suitable services from typical Algerian salon menus.',
    message_draft: 'Draft a short WhatsApp/chat message the barber can send.',
    free: 'Answer the barber operational question helpfully and briefly.',
  };

  try {
    const { output, usage } = await generateText({
      model: google(getTextModelId()),
      instructions: [
        'You are Hallaqi Barber Copilot — an assistant for Algerian barbers and salon professionals.',
        'Respond in clear Arabic (Darija OK when natural). Be practical and respectful.',
        'Never invent medical diagnoses. Never invent prices as facts.',
        'Keep answers short enough to read between clients.',
        intentHints[parsed.data.intent],
      ].join(' '),
      prompt: JSON.stringify({
        question: parsed.data.question,
        context: parsed.data.context || {},
      }),
      output: Output.object({
        name: 'hallaqi_barber_assist',
        description: 'Operational help for a barber between appointments.',
        schema: responseSchema,
      }),
      maxOutputTokens: 700,
    });

    return Response.json({ assist: output, usage });
  } catch (error) {
    console.error('AI barber assist failed', {
      userId: user.id,
      statusCode: APICallError.isInstance(error) ? error.statusCode : undefined,
    });
    if (APICallError.isInstance(error) && error.statusCode === 429) {
      return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
    }
    return Response.json({ code: 'AI_UNAVAILABLE' }, { status: 503 });
  }
}
