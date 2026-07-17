import { supabase } from '@/supabase/client';

export interface AICapabilities {
  deterministicRecommendations: boolean;
  optimizedScheduling: boolean;
  generativeAdvice: boolean;
  hairstyleImageGeneration: boolean;
  externalBlocker: string | null;
}

export interface GroomingAdvice {
  answer: string;
  suggestedServices: string[];
  cautions: string[];
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('يجب تسجيل الدخول لاستخدام المساعد');
  return {
    authorization: `Bearer ${data.session.access_token}`,
    'content-type': 'application/json',
  };
}

export async function getAICapabilities(): Promise<AICapabilities> {
  const response = await fetch('/api/ai/capabilities');
  if (!response.ok) throw new Error('تعذر التحقق من قدرات المساعد');
  return response.json();
}

export async function requestGroomingAdvice(input: {
  question: string;
  hairType?: string;
  desiredStyle?: string;
}): Promise<GroomingAdvice> {
  const response = await fetch('/api/ai/advice', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const body = await response.json() as {
    code?: string;
    advice?: GroomingAdvice;
  };
  if (!response.ok || !body.advice) {
    if (body.code === 'AI_NOT_CONFIGURED') {
      throw new Error('المساعد التوليدي ينتظر تفعيل AI Gateway');
    }
    if (body.code === 'AI_RATE_LIMITED') {
      throw new Error('وصلت للحد اليومي للمساعد. جرّب غداً.');
    }
    throw new Error('تعذر الحصول على النصيحة حالياً');
  }
  return body.advice;
}

export async function requestStyleImage(description: string): Promise<string> {
  const response = await fetch('/api/ai/style-image', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ description }),
  });
  const body = await response.json() as { code?: string; image?: string };
  if (!response.ok || !body.image) {
    if (body.code === 'AI_IMAGE_NOT_CONFIGURED') {
      throw new Error('توليد صور التسريحات ينتظر تفعيل نموذج الصور');
    }
    if (body.code === 'AI_RATE_LIMITED') {
      throw new Error('وصلت للحد اليومي لتوليد الصور. جرّب غداً.');
    }
    throw new Error('تعذر توليد الصورة حالياً');
  }
  return body.image;
}
