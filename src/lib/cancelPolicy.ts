/** Soft-launch cancel policy — single source of truth for UI copy. */

type Lang = 'ar' | 'fr' | 'en';

export const CANCEL_POLICY = {
  freeCancelHoursBefore: 2,
  summaryAr:
    'يمكنك إلغاء الموعد مجاناً قبل ساعتين على الأقل من الوقت المحدد من تبويب المواعيد.',
  summaryFr:
    'Annulation gratuite au moins 2 heures avant le rendez-vous depuis l’onglet Rendez-vous.',
  summaryEn:
    'Free cancellation at least 2 hours before the appointment from the Appointments tab.',
  detailsAr:
    'الإلغاء قبل الموعد بساعتين أو أكثر مجاني. الإلغاء المتأخر أو عدم الحضور دون إشعار قد يؤثر على حجوزاتك القادمة حسب سياسة الحلاق.',
  detailsFr:
    'Annulation gratuite 2 heures ou plus avant le rendez-vous. Un retard ou une absence non signalée peut affecter vos prochaines réservations selon la politique du coiffeur.',
  detailsEn:
    'Cancellation 2+ hours before is free. Late cancel or no-show may affect future bookings per the barber’s policy.',
  confirmAr: (barberName: string) =>
    `هل تريد إلغاء موعدك مع ${barberName}؟ الإلغاء مجاني قبل ساعتين من الموعد.`,
  confirmFr: (barberName: string) =>
    `Annuler votre rendez-vous avec ${barberName} ? Gratuit jusqu’à 2 heures avant.`,
  confirmEn: (barberName: string) =>
    `Cancel your appointment with ${barberName}? Free until 2 hours before.`,
} as const;

export function cancelPolicySummary(lang: Lang = 'ar'): string {
  return lang === 'fr' ? CANCEL_POLICY.summaryFr : lang === 'en' ? CANCEL_POLICY.summaryEn : CANCEL_POLICY.summaryAr;
}

export function cancelPolicyDetails(lang: Lang = 'ar'): string {
  return lang === 'fr' ? CANCEL_POLICY.detailsFr : lang === 'en' ? CANCEL_POLICY.detailsEn : CANCEL_POLICY.detailsAr;
}
