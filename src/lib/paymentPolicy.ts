/** Soft-launch payment / refund copy — single source for UI (#145, #150). */

type Lang = 'ar' | 'fr' | 'en';

export function refundPolicySummary(lang: Lang = 'ar'): string {
  if (lang === 'fr') {
    return 'Le paiement à la visite est en espèces. Annulation gratuite ≥2 h avant : aucun montant dû. Après ce délai ou absence, le coiffeur peut appliquer sa politique affichée.';
  }
  if (lang === 'en') {
    return 'Pay-at-visit is cash. Free cancel ≥2 h before: nothing owed. After that or a no-show, the barber’s published policy may apply.';
  }
  return 'الدفع عند الزيارة نقداً. الإلغاء المجاني قبل ساعتين فأكثر: لا مبلغ مستحق. بعد ذلك أو الغياب، قد تُطبَّق سياسة الحلاق الظاهرة.';
}

export function paymentMethodsLegalNote(lang: Lang = 'ar'): string {
  if (lang === 'fr') {
    return 'Moyens acceptés au lancement soft : espèces à la visite (DZD). Carte (Stripe), CCP et Baridi Mob : bientôt, sous conformité légale.';
  }
  if (lang === 'en') {
    return 'Accepted at soft launch: cash at the visit (DZD). Card (Stripe), CCP and Baridi Mob: coming soon pending legal readiness.';
  }
  return 'الوسائل المعتمدة عند الإطلاق الناعم: النقد عند الزيارة (دج). البطاقة (Stripe) وCCP وبريدي موب: قريباً عند الجاهزية القانونية.';
}

export function prepareCashReminder(lang: Lang = 'ar', amountLabel: string): string {
  if (lang === 'fr') {
    return `Préparez environ ${amountLabel} en espèces (DZD) pour la visite.`;
  }
  if (lang === 'en') {
    return `Prepare about ${amountLabel} in cash (DZD) for the visit.`;
  }
  return `حضّر حوالي ${amountLabel} نقداً (دج) قبل الزيارة.`;
}
