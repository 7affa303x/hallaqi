/**
 * MVP Plus Phase 1 — Growth UI mock data only.
 * No XP engine, streak logic, referral tracking, or backend.
 */

export interface GrowthProgressMock {
  level: number;
  xp: number;
  xpToNext: number;
  streakDays: number;
  badgeCount: number;
}

export interface GrowthMissionMock {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  done: boolean;
}

export interface GrowthBadgeMock {
  id: string;
  name: string;
  description: string;
  emoji: string;
  locked: boolean;
  color: string;
}

export const GROWTH_PROGRESS_MOCK: GrowthProgressMock = {
  level: 1,
  xp: 0,
  xpToNext: 100,
  streakDays: 0,
  badgeCount: 0,
};

export const GROWTH_REFERRAL_CODE = 'HALLAQI-AB12';

export const GROWTH_REFERRAL_STATS_MOCK = {
  invitedUsers: 0,
  rewardsEarned: 0,
};

export const DAILY_MISSIONS_MOCK: GrowthMissionMock[] = [
  { id: 'd1', title: 'أضف صورة', description: 'ارفع صورة لملفك أو معرضك', progress: 0, target: 1, done: false },
  { id: 'd2', title: 'اكتب تعليقاً', description: 'شارك رأيك في المنتدى', progress: 0, target: 1, done: false },
  { id: 'd3', title: 'أكمل ملفك', description: 'أضف اسماً ومدينة واضحة', progress: 0, target: 1, done: false },
];

export const WEEKLY_MISSIONS_MOCK: GrowthMissionMock[] = [
  { id: 'w1', title: 'احجز موعداً', description: 'أكمل حجزاً واحداً هذا الأسبوع', progress: 0, target: 1, done: false },
  { id: 'w2', title: 'ادعُ صديقاً', description: 'شارك كود الدعوة مع شخص واحد', progress: 0, target: 1, done: false },
  { id: 'w3', title: 'استكشف السوق', description: 'تصفّح 3 منتجات في السوق', progress: 0, target: 3, done: false },
];

export const MONTHLY_MISSIONS_MOCK: GrowthMissionMock[] = [
  { id: 'm1', title: 'ثلاث حجوزات', description: 'أكمل 3 حجوزات خلال الشهر', progress: 0, target: 3, done: false },
  { id: 'm2', title: 'منشور مجتمعي', description: 'انشر موضوعاً في المنتدى', progress: 0, target: 1, done: false },
  { id: 'm3', title: 'قيّم حلاقاً', description: 'اترك تقييماً بعد زيارة', progress: 0, target: 1, done: false },
];

/** Up to 8 badges for profile showcase + achievements page. */
export const GROWTH_BADGES_MOCK: GrowthBadgeMock[] = [
  { id: 'b1', name: 'أول حجز', description: 'أكملت أول موعد عبر حلاقي', emoji: '✂️', locked: true, color: '#0F766E' },
  { id: 'b2', name: 'داعم مبكر', description: 'انضممت في مرحلة الإطلاق', emoji: '🌱', locked: true, color: '#D97706' },
  { id: 'b3', name: 'عضو نشط', description: 'نشاط مستمر داخل التطبيق', emoji: '⚡', locked: true, color: '#2563EB' },
  { id: 'b4', name: 'أول منشور', description: 'نشرت أول موضوع في المنتدى', emoji: '💬', locked: true, color: '#7C3AED' },
  { id: 'b5', name: 'مستكشف السوق', description: 'تصفحت منتجات العناية', emoji: '🛍️', locked: true, color: '#DB2777' },
  { id: 'b6', name: 'سفير الدعوة', description: 'دعوت صديقاً للانضمام', emoji: '🎁', locked: true, color: '#059669' },
  { id: 'b7', name: 'سلسلة أسبوع', description: 'سبعة أيام متتالية من النشاط', emoji: '🔥', locked: true, color: '#EA580C' },
  { id: 'b8', name: 'محترف الملف', description: 'أكملّت ملفك الشخصي بالكامل', emoji: '🏅', locked: true, color: '#CA8A04' },
];
