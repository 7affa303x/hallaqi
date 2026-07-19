/** Language-aware AI example questions (#127). */

type Lang = 'ar' | 'fr' | 'en';

export function aiAdviceExamples(lang: Lang): string[] {
  if (lang === 'fr') {
    return [
      'Quelle coupe pour cheveux fins et plats ?',
      'Comment entretenir une barbe courte en été ?',
      'Quels soins pour cuir chevelu sec ?',
    ];
  }
  if (lang === 'en') {
    return [
      'Best cut for thin flat hair?',
      'How do I maintain a short beard in summer?',
      'Care tips for a dry scalp?',
    ];
  }
  return [
    'ما القصة المناسبة لشعر رقيق ومبطّط؟',
    'كيف أحافظ على لحية قصيرة في الصيف؟',
    'نصائح عناية لفروة جافة؟',
  ];
}

export const AI_DAILY_QUOTA_HINT = {
  ar: 'حد يومي لحماية الخدمة (حوالي 20 نصيحة/يوم للحساب).',
  fr: 'Quota quotidien pour protéger le service (~20 conseils/jour).',
  en: 'Daily limit to protect the service (~20 tips/day per account).',
} as const;
