import { generateText } from 'ai';
import {
  aiUnavailableMessage,
  getGoogleProvider,
  getTextModelId,
  isAiGenerationEnabled,
} from '../_lib/ai-provider.js';

const MODE_PROMPTS: Record<string, string> = {
  title: 'اكتب عنوان منتج قصير وجذاب بالعربية الجزائرية الفصحى المبسطة لمتجر عناية/حلاقة.',
  description: 'اكتب وصف منتج تسويقي قصير (3-5 جمل) بالعربية، بدون مبالغة طبية.',
  seo: 'اكتب نص SEO قصير (عنوان + وصف ميتا) بالعربية لسوق جزائري.',
  keywords: 'اقترح 8 كلمات مفتاحية عربية مفصولة بفواصل لمنتج عناية.',
  service: 'اكتب وصف خدمة إضافية لحلاق (ليست منتجًا ماديًا) بالعربية.',
  category: 'اقترح فئة واحدة من: hair, beard, skin, shaving, devices, courses, accessories, professional_tools مع تبرير سطر واحد.',
  caption: 'اكتب تعليق صورة قصير وجذاب بالعربية للمنشور التسويقي.',
  offer: 'اكتب نص عرض ظهور مدفوع (منتج اليوم / مساحة مميزة) بالعربية دون ادعاء خصم عشوائي.',
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { mode?: string; prompt?: string } | null;
  const mode = String(body?.mode || 'title');
  const prompt = String(body?.prompt || '').trim();

  if (!prompt) {
    return Response.json({ error: 'prompt مطلوب' }, { status: 400 });
  }

  const google = getGoogleProvider();
  if (!isAiGenerationEnabled() || !google) {
    return Response.json({
      soon: true,
      text: aiUnavailableMessage() || 'المساعد جاهز — التفعيل الكامل قريبًا بعد ضبط مفاتيح AI على الخادم.',
    }, { status: 503 });
  }

  try {
    const system = MODE_PROMPTS[mode] || MODE_PROMPTS.title;
    const { text } = await generateText({
      model: google(getTextModelId()),
      system: `${system}\nأنت تساعد البائع فقط ولا تستبدل نموذج العمل. لا تقترح عمولات أو دفع داخل التطبيق.`,
      prompt,
    });
    return Response.json({ text, mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI error';
    const soon = /429|quota|rate/i.test(message);
    return Response.json({
      soon: true,
      error: message,
      text: soon
        ? 'حصة AI ممتلئة مؤقتًا — أدوات القوائم جاهزة وتعمل فور توفر الحصة. قريبًا.'
        : 'تعذر التوليد الآن — قريبًا.',
    }, { status: soon ? 429 : 500 });
  }
}
