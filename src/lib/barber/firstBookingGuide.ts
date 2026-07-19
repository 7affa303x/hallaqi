/** First-booking checklist for barbers (#188). */

export const BARBER_FIRST_BOOKING_STEPS = [
  {
    ar: 'فعّل التوفر وحدّث ساعات العمل لهذا الأسبوع',
    fr: 'Activez la dispo et mettez à jour les horaires de la semaine',
    en: 'Turn on availability and update this week’s hours',
  },
  {
    ar: 'راجع خدماتك وأسعارها (دج) وتأكد أنها ظاهرة',
    fr: 'Vérifiez services et prix (DZD) visibles',
    en: 'Review services and DZD prices so they show correctly',
  },
  {
    ar: 'عند حجز جديد: اقبل بسرعة وأرسل رسالة تأكيد',
    fr: 'Nouveau RDV : acceptez vite et envoyez une confirmation',
    en: 'On a new booking: accept quickly and send a confirmation',
  },
  {
    ar: 'يوم الموعد: حضّر الكرسي وعلّم الحضور أو الغياب',
    fr: 'Le jour J : préparez le fauteuil et notez présence/absence',
    en: 'On the day: prep the chair and mark show / no-show',
  },
] as const;

export function barberFirstBookingSteps(lang: 'ar' | 'fr' | 'en') {
  return BARBER_FIRST_BOOKING_STEPS.map(s => (lang === 'fr' ? s.fr : lang === 'en' ? s.en : s.ar));
}
