/** Soft-launch cancel policy — single source of truth for UI copy. */
export const CANCEL_POLICY = {
  freeCancelHoursBefore: 2,
  summaryAr:
    'يمكنك إلغاء الموعد مجاناً قبل ساعتين على الأقل من الوقت المحدد من تبويب المواعيد.',
  detailsAr:
    'الإلغاء قبل الموعد بساعتين أو أكثر مجاني. الإلغاء المتأخر أو عدم الحضور دون إشعار قد يؤثر على حجوزاتك القادمة حسب سياسة الحلاق.',
  confirmAr: (barberName: string) =>
    `هل تريد إلغاء موعدك مع ${barberName}؟ الإلغاء مجاني قبل ساعتين من الموعد.`,
} as const;
