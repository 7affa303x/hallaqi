/** Multilingual legal / help bodies (#104). */

type Lang = 'ar' | 'fr' | 'en';

type Section = [string, string];

const privacy: Record<Lang, { title: string; sections: Section[] }> = {
  ar: {
    title: 'سياسة الخصوصية',
    sections: [
      ['البيانات التي نجمعها', 'بيانات الحساب (الاسم، البريد، الهاتف)، الحجوزات، الموقع الاختياري، صور الملف/المحفظة، إيصالات الدفع، وبيانات الاستخدام لتحسين الخدمة.'],
      ['كيفية الاستخدام', 'نشغّل الحجز والدفع والتواصل ومنع الاحتيال، ونفعّل مساعد AI عبر مزودين مثل Groq/Google عند تفعيل الميزة، دون بيع بياناتك الشخصية.'],
      ['المدفوعات والوثائق', 'إيصالات CCP/بريدي والبطاقات والمستندات خاصة — تظهر فقط لصاحب الحساب والأدمن/الحلاق المعني بالموافقة.'],
      ['السوق الخارجي', 'عند زيارة متجر خارجي (Visit Store) تغادر Hallaqi؛ سياسة ذلك الموقع منفصلة عنّا.'],
      ['حقوقك', 'يمكنك طلب تصدير بياناتك أو حذف حسابك من الإعدادات. للاستفسار: support@hallaqi.app'],
      ['ملفات الارتباط والتحليلات', 'قد نستخدم أدوات تحليل (مثل Vercel Analytics) لقياس الأداء بعد موافقتك الصريحة، دون تحديد هوية شخصية قدر الإمكان.'],
    ],
  },
  fr: {
    title: 'Politique de confidentialité',
    sections: [
      ['Données collectées', 'Compte (nom, e-mail, téléphone), réservations, localisation optionnelle, photos, reçus de paiement et données d’usage pour améliorer le service.'],
      ['Usage', 'Nous opérons réservation, paiement, messagerie et anti-fraude, et l’assistant IA via Groq/Google si activé — sans vendre vos données personnelles.'],
      ['Paiements', 'Reçus CCP/Baridi et documents : visibles seulement pour vous et l’admin/coiffeur concerné.'],
      ['Marketplace externe', 'Visit Store quitte Hallaqi ; la politique du site externe s’applique.'],
      ['Vos droits', 'Export ou suppression depuis les réglages. Contact : support@hallaqi.app'],
      ['Cookies / analytics', 'Analytics (ex. Vercel) uniquement après consentement explicite.'],
    ],
  },
  en: {
    title: 'Privacy Policy',
    sections: [
      ['Data we collect', 'Account data (name, email, phone), bookings, optional location, profile/portfolio photos, payment receipts, and usage data to improve the service.'],
      ['How we use it', 'We run booking, payments, messaging and fraud prevention, and AI via Groq/Google when enabled — we do not sell your personal data.'],
      ['Payments & documents', 'CCP/Baridi receipts and IDs are private — only you and the relevant admin/barber see them.'],
      ['External marketplace', 'Visit Store leaves Hallaqi; that site’s policy applies.'],
      ['Your rights', 'Request export or account deletion in settings. Contact: support@hallaqi.app'],
      ['Cookies & analytics', 'Analytics (e.g. Vercel) only after your explicit consent.'],
    ],
  },
};

const terms: Record<Lang, { title: string; sections: Section[] }> = {
  ar: {
    title: 'شروط الاستخدام',
    sections: [
      ['الحسابات والأدوار', 'يختار المستخدم دوره (عميل، حلاق، متجر، شركة، طبيب). حسابات السوق قد تبقى معلّقة حتى موافقة الإدارة.'],
      ['الحجوزات', 'يلتزم العميل بمعلومات صحيحة، ويلتزم الحلاق بتحديث التوفر والخدمات والأسعار. الإلغاء يخضع لسياسة الإلغاء الظاهرة.'],
      ['المدفوعات', 'عند الإطلاق الناعم: النقد عند الزيارة. البطاقة وCCP متوقفة حتى الجاهزية القانونية.'],
      ['السوق', 'الشراء داخل التطبيق غير مفعّل؛ الروابط الخارجية على مسؤولية البائع والمشتري.'],
      ['المساعد الذكي', 'محتوى AI استرشادي فقط وليس تشخيصاً طبياً.'],
      ['السلوك', 'يُمنع الاحتيال والتحرش والمحتوى المضلل، ويحق للإدارة تعليق الحساب.'],
    ],
  },
  fr: {
    title: 'Conditions d’utilisation',
    sections: [
      ['Comptes et rôles', 'Client, coiffeur, magasin, société, médecin. Comptes marketplace parfois en attente d’approbation.'],
      ['Réservations', 'Infos exactes requises ; le coiffeur tient disponibilités et prix à jour. Annulation selon la politique affichée.'],
      ['Paiements', 'Soft launch : espèces à la visite. Carte/CCP en pause jusqu’à conformité.'],
      ['Marketplace', 'Achat in-app désactivé ; liens externes sous responsabilité des parties.'],
      ['Assistant IA', 'Conseils généraux uniquement — pas un diagnostic médical.'],
      ['Conduite', 'Fraude, harcèlement et contenu trompeur interdits.'],
    ],
  },
  en: {
    title: 'Terms of Use',
    sections: [
      ['Accounts & roles', 'Client, barber, store, company, doctor. Marketplace accounts may await admin approval.'],
      ['Bookings', 'Accurate info required; barbers keep availability and prices updated. Cancellation follows the shown policy.'],
      ['Payments', 'Soft launch: cash at visit. Card/CCP paused until legal readiness.'],
      ['Marketplace', 'In-app checkout off; external links are between buyer and seller.'],
      ['AI assistant', 'Guidance only — not a medical diagnosis.'],
      ['Conduct', 'Fraud, harassment and misleading content are prohibited.'],
    ],
  },
};

const licenses: Record<Lang, { title: string; sections: Section[] }> = {
  ar: {
    title: 'التراخيص مفتوحة المصدر',
    sections: [
      ['التقنيات', 'React وVite وSupabase وTailwind CSS وLucide وVercel AI SDK ومكتباتها وفق تراخيصها الأصلية.'],
      ['العلامة', 'اسم وشعار Hallaqi وأصوله البصرية ملك للمنتج ولا تشملها تراخيص مكتبات البرمجيات.'],
    ],
  },
  fr: {
    title: 'Licences open source',
    sections: [
      ['Technologies', 'React, Vite, Supabase, Tailwind, Lucide, Vercel AI SDK — selon leurs licences.'],
      ['Marque', 'Nom et logo Hallaqi restent propriété du produit.'],
    ],
  },
  en: {
    title: 'Open-source licenses',
    sections: [
      ['Technologies', 'React, Vite, Supabase, Tailwind, Lucide, Vercel AI SDK — under their respective licenses.'],
      ['Brand', 'Hallaqi name and logo remain product property.'],
    ],
  },
};

const help: Record<Lang, { title: string; sections: Section[] }> = {
  ar: {
    title: 'المساعدة',
    sections: [
      ['كيف أحجز؟', 'من تبويب الحجز اختر الحلاق والخدمة والموعد. الدفع نقداً عند الزيارة.'],
      ['كيف ألغي؟', 'من تبويب المواعيد — مجاناً قبل ساعتين على الأقل.'],
      ['السوق', 'اكتشف المنتجات ثم اشترِ عبر Visit Store للمتجر الخارجي.'],
      ['الدعم', 'راسلنا: support@hallaqi.app'],
    ],
  },
  fr: {
    title: 'Aide',
    sections: [
      ['Réserver', 'Onglet Réservation → coiffeur, service, créneau. Paiement en espèces à la visite.'],
      ['Annuler', 'Onglet Rendez-vous — gratuit ≥2 h avant.'],
      ['Marketplace', 'Découvrez puis achetez via Visit Store externe.'],
      ['Support', 'Écrivez à support@hallaqi.app'],
    ],
  },
  en: {
    title: 'Help',
    sections: [
      ['How to book', 'Booking tab → barber, service, slot. Cash at the visit.'],
      ['How to cancel', 'Appointments tab — free ≥2 hours before.'],
      ['Marketplace', 'Discover products, then buy via external Visit Store.'],
      ['Support', 'Email support@hallaqi.app'],
    ],
  },
};

const whyHallaqi: Record<Lang, { title: string; sections: Section[] }> = {
  ar: {
    title: 'لماذا حلاقي؟',
    sections: [
      ['حجز بسيط', 'اعثر على حلاق قريب واحجز موعداً واضحاً دون مكالمات متكررة.'],
      ['سوق اكتشاف', 'تصفّح منتجات العناية ثم اشترِ من المتجر مباشرة بشفافية.'],
      ['مجتمع ونصائح', 'منتدى محلي ومساعد عناية بالعربية — بدون تشخيص طبي.'],
      ['جزائري أولاً', 'واجهة عربية/فرنسية، نقد عند الزيارة، وولايات جزائرية.'],
    ],
  },
  fr: {
    title: 'Pourquoi Hallaqi ?',
    sections: [
      ['Réservation simple', 'Trouvez un coiffeur proche et réservez sans appels répétés.'],
      ['Marketplace découverte', 'Parcourez les soins puis achetez chez le marchand.'],
      ['Communauté', 'Forum local et conseils en arabe/français — pas de diagnostic médical.'],
      ['Algérie d’abord', 'AR/FR, espèces à la visite, wilayas algériennes.'],
    ],
  },
  en: {
    title: 'Why Hallaqi?',
    sections: [
      ['Simple booking', 'Find a nearby barber and book without endless calls.'],
      ['Discovery marketplace', 'Browse care products, then buy at the store.'],
      ['Community & tips', 'Local forum and grooming tips — not medical advice.'],
      ['Algeria-first', 'AR/FR UI, cash at visit, Algerian wilayas.'],
    ],
  },
};

export function getLegalContent(kind: 'privacy' | 'terms' | 'licenses', lang: Lang) {
  const table = kind === 'privacy' ? privacy : kind === 'terms' ? terms : licenses;
  return table[lang] || table.ar;
}

export function getHelpContent(lang: Lang) {
  return help[lang] || help.ar;
}

export function getWhyHallaqiContent(lang: Lang) {
  return whyHallaqi[lang] || whyHallaqi.ar;
}
