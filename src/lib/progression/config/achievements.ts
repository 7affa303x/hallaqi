import type { AchievementDef } from '@/lib/progression/models/types';

export const ACHIEVEMENT_CATALOG: readonly AchievementDef[] = [
  {
    id: 'ach_first_booking',
    titleAr: 'أول حجز',
    descriptionAr: 'أكمل أول موعد',
    criteria: { completedBookings: 1 },
    xpReward: 10,
  },
  {
    id: 'ach_first_review',
    titleAr: 'أول تقييم',
    descriptionAr: 'اترك أول تقييم',
    criteria: { reviews: 1 },
    xpReward: 10,
  },
  {
    id: 'ach_first_comment',
    titleAr: 'أول تعليق',
    descriptionAr: 'علّق لأول مرة في المنتدى',
    criteria: { forumComments: 1 },
    xpReward: 5,
  },
  {
    id: 'ach_first_post',
    titleAr: 'أول منشور',
    descriptionAr: 'انشر أول موضوع',
    criteria: { forumPosts: 1 },
    xpReward: 10,
  },
  {
    id: 'ach_customers_10',
    titleAr: '10 زبائن',
    descriptionAr: '10 حجوزات مكتملة',
    criteria: { completedBookings: 10 },
    xpReward: 25,
  },
  {
    id: 'ach_customers_50',
    titleAr: '50 زبوناً',
    descriptionAr: '50 حجزاً مكتملاً',
    criteria: { completedBookings: 50 },
    xpReward: 50,
  },
  {
    id: 'ach_customers_100',
    titleAr: '100 زبون',
    descriptionAr: '100 حجز مكتمل',
    criteria: { completedBookings: 100 },
    xpReward: 100,
  },
  {
    id: 'ach_referrals_10',
    titleAr: '10 دعوات',
    descriptionAr: 'شارك الدعوة 10 مرات',
    criteria: { referralShares: 10 },
    xpReward: 40,
  },
] as const;
