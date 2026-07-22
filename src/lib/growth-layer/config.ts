/** Growth layer configuration — isolated from XP engine values. */

export const REFERRAL_BASE_URL = 'https://hallaqi.app';

export const REFERRAL_XP = {
  barber: 50,
  customer: 10,
} as const;

export const AMBASSADOR_REQUIREMENTS = {
  minRating: 4.5,
  minLevel: 5,
  minCompletedBookings: 20,
  requiresVerification: true,
} as const;

/** Placeholder coin rules — purchasing not implemented yet. */
export const COIN_RULES = {
  storePurchaseCashbackPercent: 1,
  referralCampaignBonus: 0,
  specialEventMultiplier: 1,
} as const;

export const GROWTH_RANKING_METRICS = [
  'xp',
  'bookings',
  'reviews',
  'growth',
  'community',
  'rating',
  'followers',
  'completed_jobs',
] as const;

export const GROWTH_RANKING_METRIC_LABELS: Record<string, string> = {
  xp: 'نقاط XP',
  bookings: 'الحجوزات',
  reviews: 'التقييمات',
  growth: 'النمو',
  community: 'المجتمع',
  rating: 'التقييم',
  followers: 'المتابعين',
  completed_jobs: 'الأعمال المكتملة',
};

export const REWARD_CATEGORY_LABELS: Record<string, string> = {
  pro: 'اشتراك Pro',
  coupon: 'كوبونات',
  product: 'منتجات',
  credit: 'رصيد ترويج',
  gift_card: 'حلاقة مجانية',
};

// TODO(seasonal-events): campaign configs plug in here without rewriting services.
