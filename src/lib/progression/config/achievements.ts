import type { AchievementAudience, AchievementCategory, AchievementDef } from '@/lib/progression/models/types';

const BSG = [
  { target: 1, coinReward: 2, xpReward: 2, tier: 'bronze' as const },
  { target: 5, coinReward: 5, xpReward: 5, tier: 'silver' as const },
  { target: 10, coinReward: 10, xpReward: 10, tier: 'gold' as const },
];

const BSM = [
  { target: 2, coinReward: 2, xpReward: 2, tier: 'bronze' as const },
  { target: 8, coinReward: 5, xpReward: 5, tier: 'silver' as const },
  { target: 20, coinReward: 10, xpReward: 10, tier: 'gold' as const },
];

const BSL = [
  { target: 5, coinReward: 2, xpReward: 2, tier: 'bronze' as const },
  { target: 25, coinReward: 5, xpReward: 5, tier: 'silver' as const },
  { target: 50, coinReward: 10, xpReward: 10, tier: 'gold' as const },
];

function ach(
  id: string,
  audience: AchievementAudience,
  category: AchievementCategory,
  titleAr: string,
  descriptionAr: string,
  criteria: AchievementDef['criteria'],
  tiers: AchievementDef['tiers'],
): AchievementDef {
  return { id, audience, category, titleAr, descriptionAr, criteria, tiers };
}

const CLIENT: AchievementDef[] = [
  ach('cl_booking_first', 'client', 'booking', 'أول حجز', 'أكمل مواعيدك', { completedBookings: 10 }, BSG),
  ach('cl_booking_loyal', 'client', 'booking', 'زبون مخلص', 'حجوزات متكررة', { completedBookings: 25 }, BSL),
  ach('cl_booking_100', 'client', 'booking', '100 موعد', 'وصل لمئة حجز', { completedBookings: 100 }, [
    { target: 10, coinReward: 2, xpReward: 2, tier: 'bronze' },
    { target: 50, coinReward: 5, xpReward: 5, tier: 'silver' },
    { target: 100, coinReward: 10, xpReward: 10, tier: 'gold' },
  ]),
  ach('cl_review_first', 'client', 'quality', 'أول تقييم', 'قيّم تجربتك', { reviews: 10 }, BSG),
  ach('cl_review_active', 'client', 'quality', 'مقيّم نشط', 'شارك آراءك', { reviews: 25 }, BSM),
  ach('cl_comment_first', 'client', 'community', 'أول تعليق', 'تفاعل في المنتدى', { forumComments: 10 }, BSG),
  ach('cl_post_first', 'client', 'community', 'أول منشور', 'انشر في المجتمع', { forumPosts: 10 }, BSG),
  ach('cl_forum_active', 'client', 'community', 'عضو نشط', 'شارك باستمرار', { forumPosts: 20 }, BSM),
  ach('cl_referral', 'client', 'growth', 'دعوات الأصدقاء', 'شارك رابط الدعوة', { referralShares: 10 }, BSG),
  ach('cl_referral_amb', 'client', 'growth', 'سفير حلاقي', 'انشر المنصة', { referralShares: 25 }, BSM),
  ach('cl_streak_week', 'client', 'streak', 'سلسلة أسبوع', '7 أيام متتالية', { streakDays: 7 }, [
    { target: 2, coinReward: 2, xpReward: 2, tier: 'bronze' },
    { target: 4, coinReward: 5, xpReward: 5, tier: 'silver' },
    { target: 7, coinReward: 10, xpReward: 10, tier: 'gold' },
  ]),
  ach('cl_streak_month', 'client', 'streak', 'سلسلة شهر', '30 يوماً', { streakDays: 30 }, [
    { target: 7, coinReward: 2, xpReward: 2, tier: 'bronze' },
    { target: 15, coinReward: 5, xpReward: 5, tier: 'silver' },
    { target: 30, coinReward: 10, xpReward: 10, tier: 'gold' },
  ]),
  ach('cl_profile', 'client', 'profile', 'ملف مكتمل', 'أكمل بياناتك', { hasAvatar: true }, BSG),
];

const BARBER: AchievementDef[] = [
  ach('br_jobs_first', 'barber', 'booking', 'أول عميل', 'أكمل حجوزات عملائك', { completedBookings: 10 }, BSG),
  ach('br_jobs_pro', 'barber', 'booking', 'حلاق محترف', 'حجوزات متتالية', { completedBookings: 50 }, BSL),
  ach('br_jobs_100', 'barber', 'booking', '100 حجز', 'مئة موعد مكتمل', { completedBookings: 100 }, [
    { target: 10, coinReward: 2, xpReward: 2, tier: 'bronze' },
    { target: 50, coinReward: 5, xpReward: 5, tier: 'silver' },
    { target: 100, coinReward: 10, xpReward: 10, tier: 'gold' },
  ]),
  ach('br_gallery', 'barber', 'profile', 'معرض الأعمال', 'أكمل معرض صورك', { galleryCompleted: true }, BSG),
  ach('br_verified', 'barber', 'quality', 'حساب موثّق', 'تحقق من هويتك', { verified: true }, BSG),
  ach('br_trusted', 'barber', 'quality', 'حلاق موثوق', 'احصل على ثقة المنصة', { trusted: true }, BSM),
  ach('br_forum', 'barber', 'community', 'نصائح الحلاق', 'شارك خبرتك', { forumPosts: 15 }, BSM),
  ach('br_referral', 'barber', 'growth', 'دعوة حلاقين', 'ادعُ زملاءك', { referralShares: 10 }, BSG),
  ach('br_streak', 'barber', 'streak', 'نشاط يومي', 'حافظ على الحضور', { streakDays: 14 }, [
    { target: 3, coinReward: 2, xpReward: 2, tier: 'bronze' },
    { target: 7, coinReward: 5, xpReward: 5, tier: 'silver' },
    { target: 14, coinReward: 10, xpReward: 10, tier: 'gold' },
  ]),
  ach('br_reviews', 'barber', 'quality', 'تقييمات ممتازة', 'اجمع تقييمات', { reviews: 20 }, BSM),
];

const STORE: AchievementDef[] = [
  ach('st_catalog', 'store', 'marketplace', 'متجر نشط', 'أضف منتجاتك', { forumPosts: 1 }, BSG),
  ach('st_sales', 'store', 'marketplace', 'مبيعات أولى', 'بع عبر المنصة', { completedBookings: 5 }, BSG),
  ach('st_growth', 'store', 'growth', 'نمو المتجر', 'شارك متجرك', { referralShares: 10 }, BSM),
  ach('st_verified', 'store', 'quality', 'متجر موثّق', 'تحقق من حسابك', { verified: true }, BSG),
  ach('st_community', 'store', 'community', 'تواصل مع الزبائن', 'تفاعل في المنتدى', { forumComments: 10 }, BSM),
  ach('st_streak', 'store', 'streak', 'حضور منتظم', 'تابع نشاط متجرك', { streakDays: 7 }, BSG),
  ach('st_profile', 'store', 'profile', 'ملف متجر', 'أكمل ملف المتجر', { hasAvatar: true }, BSG),
  ach('st_promo', 'store', 'growth', 'حملات ترويج', 'روّج لمنتجاتك', { referralShares: 20 }, BSL),
];

export const ACHIEVEMENT_CATALOG: readonly AchievementDef[] = [
  ...CLIENT,
  ...BARBER,
  ...STORE,
] as const;

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  booking: 'الحجوزات',
  community: 'المجتمع',
  growth: 'الدعوات والنمو',
  streak: 'السلاسل',
  quality: 'الجودة',
  marketplace: 'السوق',
  profile: 'الملف',
};

export const TIER_METAL_COLORS = {
  bronze: '#CD7F32',
  silver: '#9CA3AF',
  gold: '#EAB308',
} as const;

export function achievementAudienceForRole(
  role?: string | null,
): AchievementAudience {
  if (role === 'barber' || role === 'specialist') return 'barber';
  if (role === 'store') return 'store';
  return 'client';
}

export function achievementsForRole(role?: string | null): AchievementDef[] {
  const audience = achievementAudienceForRole(role);
  return ACHIEVEMENT_CATALOG.filter(a => a.audience === audience);
}
