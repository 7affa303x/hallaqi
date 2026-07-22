import type { XpEventType } from '@/lib/progression/config/xpEvents';

export type BadgeCategory =
  | 'booking'
  | 'community'
  | 'referral'
  | 'gallery'
  | 'verification'
  | 'seasonal'
  | 'streak';

export type MissionType = 'daily' | 'weekly' | 'monthly' | 'seasonal';

export interface CriteriaMap {
  completedBookings?: number;
  reviews?: number;
  forumPosts?: number;
  forumComments?: number;
  referralShares?: number;
  streakDays?: number;
  trusted?: boolean;
  verified?: boolean;
  earlySupporter?: boolean;
  galleryCompleted?: boolean;
  hasAvatar?: boolean;
  phoneVerified?: boolean;
}

export type BadgeAudience = 'client' | 'barber' | 'store' | 'doctor';

export interface BadgeDef {
  id: string;
  category: BadgeCategory;
  nameAr: string;
  descriptionAr: string;
  emoji: string;
  color: string;
  criteria: CriteriaMap;
  xpBonus: number;
  /** When set, badge is shown/earned only for these account roles. */
  audience?: readonly BadgeAudience[];
}

export interface AchievementDef {
  id: string;
  titleAr: string;
  descriptionAr: string;
  criteria: CriteriaMap;
  xpReward: number;
}

export interface MissionDef {
  id: string;
  titleAr: string;
  descriptionAr: string;
  type: MissionType;
  target: number;
  xpReward: number;
  signalKey: string;
  seasonKey?: string | null;
}

export interface UserBadgeState {
  badgeId: string;
  earnedAt: string;
  isPinned: boolean;
  pinOrder: number | null;
}

export interface UserAchievementState {
  achievementId: string;
  progress: number;
  earnedAt: string | null;
}

export interface UserMissionState {
  missionId: string;
  periodKey: string;
  progress: number;
  target: number;
  completed: boolean;
  claimedAt: string | null;
}

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
}

export interface ProgressState {
  userId: string;
  totalXp: number;
  level: number;
  // TODO(coins): coinsBalance: number;
}

export interface AwardXpResult {
  ok: boolean;
  amount: number;
  totalXp: number;
  level: number;
  reason?: string;
  eventType: XpEventType;
}

export interface ProgressionSignals {
  userId?: string | null;
  hasAvatar: boolean;
  hasCompleteProfile: boolean;
  phoneVerified: boolean;
  galleryPhotoCount: number;
  galleryCompleted: boolean;
  galleryUpdatedThisMonth: boolean;
  forumCommentCount: number;
  forumCommentToday: number;
  forumPostCount: number;
  forumPostsThisWeek: number;
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  completedBookings: number;
  reviewedBookings: number;
  reviewsToday: number;
  referralShares: number;
  inviteCustomerCount: number;
  inviteBarberCount: number;
  isVerified: boolean;
  isTrusted: boolean;
  isEarlySupporter: boolean;
}

export interface MissionView {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  progress: number;
  target: number;
  done: boolean;
  xpReward: number;
  claimed: boolean;
}

export interface BadgeView {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  category: BadgeCategory;
  locked: boolean;
  isPinned: boolean;
  pinOrder: number | null;
}

export interface AchievementView {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  earned: boolean;
  xpReward: number;
}

export interface ProgressionSnapshot {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpToNext: number;
  streakDays: number;
  bestStreak: number;
  badgeCount: number;
  pinnedBadges: BadgeView[];
  badges: BadgeView[];
  achievements: AchievementView[];
  daily: MissionView[];
  weekly: MissionView[];
  monthly: MissionView[];
  seasonal: MissionView[];
  referralCode: string;
  invitedUsers: number;
  /** Soft metric for rewards page shell — not redeemable coins. */
  rewardsEarned: number;
}
