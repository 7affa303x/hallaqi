import { supabase } from '@/supabase/client';

export interface AICapabilities {
  deterministicRecommendations: boolean;
  optimizedScheduling: boolean;
  generativeAdvice: boolean;
  hairstyleImageGeneration: boolean;
  barberAssist?: boolean;
  provider?: string | null;
  externalBlocker: string | null;
}

export interface GroomingAdvice {
  answer: string;
  suggestedServices: string[];
  cautions: string[];
}

export interface BarberAssistResult {
  answer: string;
  suggestedActions: string[];
  messageDraft?: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('يجب تسجيل الدخول لاستخدام المساعد');
  return {
    authorization: `Bearer ${data.session.access_token}`,
    'content-type': 'application/json',
  };
}

function mapAiError(code?: string, fallback = 'تعذر تنفيذ الطلب حالياً'): never {
  if (code === 'AI_NOT_CONFIGURED') {
    throw new Error('المساعد النصي يحتاج إعداد GROQ_API_KEY على الخادم');
  }
  if (code === 'AI_IMAGE_NOT_CONFIGURED') {
    throw new Error('توليد الصور غير مفعّل حالياً (يتطلب Gemini)');
  }
  if (code === 'AI_RATE_LIMITED') {
    throw new Error('وصلت للحد اليومي للمساعد. جرّب غداً.');
  }
  throw new Error(fallback);
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
    mapAiError(body.code, 'تعذر الحصول على النصيحة حالياً');
  }
  return body.advice!;
}

export async function requestStyleImage(description: string): Promise<string> {
  const response = await fetch('/api/ai/style-image', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ description }),
  });
  const body = await response.json() as { code?: string; image?: string };
  if (!response.ok || !body.image) {
    mapAiError(body.code, 'تعذر توليد الصورة حالياً');
  }
  return body.image!;
}

export async function requestBarberAssist(input: {
  intent?: 'client_brief' | 'reply_review' | 'service_suggestion' | 'message_draft' | 'free';
  question: string;
  context?: {
    clientName?: string;
    serviceName?: string;
    notes?: string;
    visitHistory?: string;
    reviewText?: string;
    reviewRating?: number;
  };
}): Promise<BarberAssistResult> {
  const response = await fetch('/api/ai/barber-assist', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const body = await response.json() as {
    code?: string;
    assist?: BarberAssistResult;
  };
  if (!response.ok || !body.assist) {
    mapAiError(body.code, 'تعذر الحصول على مساعدة الحلاق حالياً');
  }
  return body.assist!;
}
