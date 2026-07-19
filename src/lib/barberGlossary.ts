/** Tri-lingual barbering glossary (#102). */

export type GlossaryTerm = {
  id: string;
  ar: string;
  fr: string;
  en: string;
  meaningAr: string;
  meaningFr: string;
  meaningEn: string;
};

export const BARBER_GLOSSARY: GlossaryTerm[] = [
  {
    id: 'fade',
    ar: 'فيد / تدريج',
    fr: 'Dégradé (fade)',
    en: 'Fade',
    meaningAr: 'قص يتدرج من قصير جداً للأسفل إلى أطول للأعلى.',
    meaningFr: 'Coupe qui passe du très court en bas au plus long en haut.',
    meaningEn: 'A cut that blends from very short at the bottom to longer on top.',
  },
  {
    id: 'taper',
    ar: 'تيبر',
    fr: 'Taper',
    en: 'Taper',
    meaningAr: 'تدريج خفيف حول الأذنين والرقبة دون فيد كامل.',
    meaningFr: 'Léger dégradé autour des oreilles et de la nuque.',
    meaningEn: 'A subtle blend around the ears and nape.',
  },
  {
    id: 'beard-line',
    ar: 'تحديد لحية',
    fr: 'Contour de barbe',
    en: 'Beard line-up',
    meaningAr: 'تنظيف حدود اللحية والوجنتين للحصول على شكل نظيف.',
    meaningFr: 'Nettoyage des contours de barbe pour un rendu net.',
    meaningEn: 'Cleaning beard edges for a sharp shape.',
  },
  {
    id: 'hot-towel',
    ar: 'منشفة ساخنة',
    fr: 'Serviette chaude',
    en: 'Hot towel',
    meaningAr: 'تليين البشرة قبل الحلاقة أو بعدها للراحة.',
    meaningFr: 'Assouplit la peau avant/après le rasage.',
    meaningEn: 'Softens skin before or after a shave.',
  },
  {
    id: 'skin-fade',
    ar: 'سكين فيد',
    fr: 'Skin fade',
    en: 'Skin fade',
    meaningAr: 'فيد ينزل حتى الجلد في الأسفل.',
    meaningFr: 'Fade qui descend jusqu’à la peau.',
    meaningEn: 'A fade that goes down to the skin.',
  },
  {
    id: 'walk-in',
    ar: 'بدون موعد (Walk-in)',
    fr: 'Sans rendez-vous',
    en: 'Walk-in',
    meaningAr: 'عميل يأتي مباشرة دون حجز مسبق إن سمح الوقت.',
    meaningFr: 'Client sans réservation si le créneau le permet.',
    meaningEn: 'A client who arrives without a prior booking when capacity allows.',
  },
];

export function glossaryMeaning(term: GlossaryTerm, lang: 'ar' | 'fr' | 'en'): string {
  return lang === 'fr' ? term.meaningFr : lang === 'en' ? term.meaningEn : term.meaningAr;
}

export function glossaryLabel(term: GlossaryTerm, lang: 'ar' | 'fr' | 'en'): string {
  return lang === 'fr' ? term.fr : lang === 'en' ? term.en : term.ar;
}
