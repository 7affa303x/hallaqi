import type { MissionDef, MissionType } from '@/lib/progression/models/types';

/**
 * Default mission catalog. Prefer DB `progression_missions` when available;
 * this file is the offline / seed source of truth for the client engine.
 */
export const MISSION_CATALOG: readonly MissionDef[] = [
  {
    id: 'daily_login',
    titleAr: 'تسجيل الدخول',
    descriptionAr: 'افتح التطبيق اليوم',
    type: 'daily' as MissionType,
    target: 1,
    xpReward: 5,
    signalKey: 'daily_login',
  },
  {
    id: 'daily_comment',
    titleAr: 'علّق اليوم',
    descriptionAr: 'اكتب تعليقاً في المنتدى',
    type: 'daily',
    target: 1,
    xpReward: 10,
    signalKey: 'forum_comment_today',
  },
  {
    id: 'daily_review',
    titleAr: 'قيّم اليوم',
    descriptionAr: 'اترك تقييماً',
    type: 'daily',
    target: 1,
    xpReward: 10,
    signalKey: 'review_today',
  },
  {
    id: 'daily_photo',
    titleAr: 'ارفع صورة',
    descriptionAr: 'أضف صورة للملف أو المعرض',
    type: 'daily',
    target: 1,
    xpReward: 10,
    signalKey: 'has_avatar',
  },
  {
    id: 'weekly_booking',
    titleAr: 'أكمل حجزاً',
    descriptionAr: 'حجز واحد هذا الأسبوع',
    type: 'weekly',
    target: 1,
    xpReward: 25,
    signalKey: 'bookings_this_week',
  },
  {
    id: 'weekly_posts',
    titleAr: 'انشر مواضيع',
    descriptionAr: 'منشوران هذا الأسبوع',
    type: 'weekly',
    target: 2,
    xpReward: 25,
    signalKey: 'forum_posts_week',
  },
  {
    id: 'weekly_invite',
    titleAr: 'ادعُ صديقاً',
    descriptionAr: 'شارك كود الدعوة',
    type: 'weekly',
    target: 1,
    xpReward: 25,
    signalKey: 'referral_shares',
  },
  {
    id: 'monthly_bookings',
    titleAr: '5 حجوزات',
    descriptionAr: 'أكمل 5 حجوزات هذا الشهر',
    type: 'monthly',
    target: 5,
    xpReward: 75,
    signalKey: 'bookings_this_month',
  },
  {
    id: 'monthly_reviews',
    titleAr: '10 تقييمات',
    descriptionAr: 'اترك 10 تقييمات',
    type: 'monthly',
    target: 10,
    xpReward: 75,
    signalKey: 'reviewed_bookings',
  },
  {
    id: 'monthly_gallery',
    titleAr: 'حدّث المعرض',
    descriptionAr: 'حدّث معرض أعمالك',
    type: 'monthly',
    target: 1,
    xpReward: 50,
    signalKey: 'gallery_updated',
  },
] as const;

export function missionsByType(type: MissionType, catalog: readonly MissionDef[] = MISSION_CATALOG): MissionDef[] {
  return catalog.filter(m => m.type === type);
}
