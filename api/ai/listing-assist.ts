import { APICallError, generateText } from 'ai';
import { z } from 'zod';
import {
  aiUnavailableMessage,
  getGoogleProvider,
  getTextModelId,
  isAiGenerationEnabled,
} from '../_lib/ai-provider.js';

const requestSchema = z.object({
  tool: z.enum(['title', 'seo', 'keywords', 'service', 'category', 'offer', 'caption']),
  prompt: z.string().trim().min(2).max(600),
});

const toolHints: Record<string, string> = {
  title: 'Write a short Arabic product title for an Algerian marketplace listing.',
  seo: 'Write a concise Arabic SEO product description (2-3 sentences).',
  keywords: 'Suggest 6-10 Arabic SEO keywords separated by Arabic commas.',
  service: 'Write a short Arabic service description for a barber extra service (not a physical product).',
  category: 'Suggest the best marketplace category among: hair, beard, skin, shaving, devices, courses, accessories, professional_tools (and subcategories if useful). Reply in Arabic.',
  offer: 'Write Arabic advertising offer copy for a paid placement slot (featured / product of the day). Emphasize visibility, not random discounts.',
  caption: 'Write a short Arabic image caption for a product photo.',
};

function fallbackText(tool: string, prompt: string): string {
  switch (tool) {
    case 'title': return `${prompt} — جودة صالون احترافية | توصيل الجزائر`;
    case 'seo': return `${prompt}. منتج مختار بعناية لعشاق العناية الشخصية في الجزائر. اكتشف التفاصيل عبر متجرنا الرسمي.`;
    case 'keywords': return `${prompt.split(/\s+/).slice(0, 6).join('، ')}، عناية، جزائر، صالون`;
    case 'service': return `خدمة ${prompt}: تجربة مريحة مع اهتمام بالتفاصيل.`;
    case 'category': return 'اقتراح الفئة: أجهزة / أدوات احترافية';
    case 'offer': return `عرض ظهور مميز: ${prompt} — موضع إعلاني مدفوع لفترة محدودة.`;
    case 'caption': return `لقطة احترافية لـ ${prompt}.`;
    default: return prompt;
  }
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ code: 'INVALID_INPUT' }, { status: 400 });
  }

  const google = getGoogleProvider();
  if (!isAiGenerationEnabled() || !google) {
    return Response.json({
      text: fallbackText(parsed.data.tool, parsed.data.prompt),
      fallback: true,
      message: aiUnavailableMessage(),
    });
  }

  try {
    const { text } = await generateText({
      model: google(getTextModelId()),
      instructions: [
        'You are Hallaqi Marketplace Listing Copilot for Algerian sellers.',
        'Respond in clear Arabic. Be concise and commercial.',
        'Never invent medical diagnoses. Never invent prices as facts.',
        'Do not mention commissions or in-app checkout.',
        toolHints[parsed.data.tool],
      ].join(' '),
      prompt: parsed.data.prompt,
      maxOutputTokens: 400,
    });

    return Response.json({ text: text.trim(), fallback: false });
  } catch (error) {
    console.error('AI listing assist failed', {
      statusCode: APICallError.isInstance(error) ? error.statusCode : undefined,
    });
    return Response.json({
      text: fallbackText(parsed.data.tool, parsed.data.prompt),
      fallback: true,
      code: 'AI_FALLBACK',
    });
  }
}
