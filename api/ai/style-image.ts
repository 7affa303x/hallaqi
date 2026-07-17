import { APICallError, generateText } from 'ai';
import { z } from 'zod';
import { authenticateSupabaseRequest, consumeAiQuota } from '../_lib/auth.js';

const requestSchema = z.object({
  description: z.string().trim().min(10).max(600),
});

export async function POST(request: Request) {
  const user = await authenticateSupabaseRequest(request);
  if (!user) return Response.json({ code: 'UNAUTHORIZED' }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: 'INVALID_INPUT' }, { status: 400 });
  if (process.env.AI_GENERATION_ENABLED !== 'true' || !process.env.AI_IMAGE_MODEL) {
    return Response.json({
      code: 'AI_IMAGE_NOT_CONFIGURED',
      message: 'Style image generation requires an enabled AI Gateway image model.',
    }, { status: 503 });
  }
  if (!await consumeAiQuota(user, 'style-image')) {
    return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
  }

  try {
    const result = await generateText({
      model: process.env.AI_IMAGE_MODEL,
      instructions: [
        'Generate a clean editorial hairstyle reference image for an adult.',
        'Show hair and grooming only. Do not imitate a real person or use a supplied face.',
        'Neutral studio background, realistic salon reference, no text or logos.',
      ].join(' '),
      prompt: parsed.data.description,
      providerOptions: {
        gateway: {
          user: user.id,
          tags: ['feature:hairstyle-image', 'product:hallaqi'],
        },
      },
    });
    const image = result.files.find(file => file.mediaType.startsWith('image/'));
    if (!image) return Response.json({ code: 'NO_IMAGE_GENERATED' }, { status: 502 });
    return Response.json({
      image: `data:${image.mediaType};base64,${image.base64}`,
      mediaType: image.mediaType,
      usage: result.usage,
    });
  } catch (error) {
    console.error('AI style image generation failed', {
      userId: user.id,
      statusCode: APICallError.isInstance(error) ? error.statusCode : undefined,
    });
    if (APICallError.isInstance(error) && error.statusCode === 429) {
      return Response.json({ code: 'AI_RATE_LIMITED' }, { status: 429 });
    }
    return Response.json({ code: 'AI_IMAGE_UNAVAILABLE' }, { status: 503 });
  }
}
