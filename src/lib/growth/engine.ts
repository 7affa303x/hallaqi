import type { Booking } from '@/types';
import {
  DAILY_MISSIONS_MOCK,
  WEEKLY_MISSIONS_MOCK,
  MONTHLY_MISSIONS_MOCK,
  GROWTH_BADGES_MOCK,
  GROWTH_REFERRAL_CODE,
  type GrowthBadgeMock,
  type GrowthMissionMock,
} from '@/data/growthMock';
import {
  claimMissionXp,
  loadGrowthState,
  touchGrowthStreak,
  unlockBadge,
  xpToLevel,
  type GrowthStoredState,
} from '@/lib/growth/storage';

export type MissionPeriod = 'daily' | 'weekly' | 'monthly';

export interface GrowthSignals {
  userId?: string | null;
  hasAvatar: boolean;
  hasCompleteProfile: boolean;
  forumCommentCount: number;
  forumPostCount: number;
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  completedBookings: number;
  reviewedBookings: number;
  marketplaceViews: number;
  referralShares: number;
}

export interface GrowthSnapshot {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpToNext: number;
  streakDays: number;
  badgeCount: number;
  referralCode: string;
  invitedUsers: number;
  rewardsEarned: number;
  daily: GrowthMissionMock[];
  weekly: GrowthMissionMock[];
  monthly: GrowthMissionMock[];
  badges: GrowthBadgeMock[];
  stored: GrowthStoredState;
}

const XP_REWARD: Record<MissionPeriod, number> = {
  daily: 25,
  weekly: 50,
  monthly: 100,
};

function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function buildGrowthSignals(input: {
  userId?: string | null;
  fullName?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  bookings: Booking[];
  forumPosts: { authorId: string; comments?: { authorId: string }[]; createdAt?: string }[];
}): GrowthSignals {
  const stored = loadGrowthState(input.userId);
  const uid = input.userId || '';
  const weekStart = startOfWeek().getTime();
  const monthStart = startOfMonth().getTime();

  const bookings = input.bookings;
  const inRange = (iso: string | undefined, from: number) => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return Number.isFinite(t) && t >= from;
  };

  const forumCommentCount = input.forumPosts.reduce((sum, post) => {
    const comments = post.comments || [];
    return sum + comments.filter(c => c.authorId === uid).length;
  }, 0) + stored.localForumComments;

  const forumPostCount = input.forumPosts.filter(p => p.authorId === uid).length;

  return {
    userId: input.userId,
    hasAvatar: Boolean(input.avatarUrl && !input.avatarUrl.endsWith('/logo-icon.png')),
    hasCompleteProfile: Boolean((input.fullName || '').trim().length >= 2 && (input.city || '').trim().length >= 2),
    forumCommentCount,
    forumPostCount,
    bookingsThisWeek: bookings.filter(b => inRange(b.createdAt, weekStart)).length,
    bookingsThisMonth: bookings.filter(b => inRange(b.createdAt, monthStart)).length,
    completedBookings: bookings.filter(b => b.status === 'completed').length,
    reviewedBookings: bookings.filter(b => b.reviewed || (typeof b.rating === 'number' && b.rating > 0)).length,
    marketplaceViews: stored.marketplaceProductViews.length,
    referralShares: stored.referralShares,
  };
}

function fillMission(
  template: GrowthMissionMock,
  progress: number,
): GrowthMissionMock {
  const clamped = Math.min(template.target, Math.max(0, progress));
  return {
    ...template,
    progress: clamped,
    done: clamped >= template.target,
  };
}

function missionProgress(id: string, signals: GrowthSignals): number {
  switch (id) {
    case 'd1': return signals.hasAvatar ? 1 : 0;
    case 'd2': return Math.min(1, signals.forumCommentCount);
    case 'd3': return signals.hasCompleteProfile ? 1 : 0;
    case 'w1': return Math.min(1, signals.bookingsThisWeek);
    case 'w2': return Math.min(1, signals.referralShares);
    case 'w3': return Math.min(3, signals.marketplaceViews);
    case 'm1': return Math.min(3, signals.bookingsThisMonth);
    case 'm2': return Math.min(1, signals.forumPostCount);
    case 'm3': return Math.min(1, signals.reviewedBookings);
    default: return 0;
  }
}

function syncClaims(
  userId: string | null | undefined,
  missions: GrowthMissionMock[],
  period: MissionPeriod,
  state: GrowthStoredState,
): GrowthStoredState {
  let next = state;
  for (const m of missions) {
    if (m.done && !next.claimedMissions[m.id]) {
      next = claimMissionXp(userId, m.id, XP_REWARD[period]);
    }
  }
  return next;
}

function syncBadges(
  userId: string | null | undefined,
  signals: GrowthSignals,
  state: GrowthStoredState,
): GrowthStoredState {
  let next = state;
  const rules: Record<string, boolean> = {
    b1: signals.completedBookings >= 1 || signals.bookingsThisMonth >= 1,
    b2: signals.hasCompleteProfile || signals.hasAvatar || next.streakDays >= 1,
    b3: signals.forumPostCount + signals.forumCommentCount >= 3 || next.streakDays >= 3,
    b4: signals.forumPostCount >= 1,
    b5: signals.marketplaceViews >= 3,
    b6: signals.referralShares >= 1,
    b7: next.streakDays >= 7,
    b8: signals.hasCompleteProfile && signals.hasAvatar,
  };
  for (const [id, ok] of Object.entries(rules)) {
    if (ok && !next.unlockedBadges.includes(id)) {
      next = unlockBadge(userId, id);
    }
  }
  return next;
}

/** Evaluate live growth snapshot from app signals + device storage. */
export function evaluateGrowth(signals: GrowthSignals): GrowthSnapshot {
  touchGrowthStreak(signals.userId);
  let stored = loadGrowthState(signals.userId);

  const daily = DAILY_MISSIONS_MOCK.map(m => fillMission(m, missionProgress(m.id, signals)));
  const weekly = WEEKLY_MISSIONS_MOCK.map(m => fillMission(m, missionProgress(m.id, signals)));
  const monthly = MONTHLY_MISSIONS_MOCK.map(m => fillMission(m, missionProgress(m.id, signals)));

  stored = syncClaims(signals.userId, daily, 'daily', stored);
  stored = syncClaims(signals.userId, weekly, 'weekly', stored);
  stored = syncClaims(signals.userId, monthly, 'monthly', stored);
  stored = syncBadges(signals.userId, signals, stored);
  stored = loadGrowthState(signals.userId);

  const { level, xpIntoLevel, xpToNext } = xpToLevel(stored.xp);
  const badges = GROWTH_BADGES_MOCK.map(b => ({
    ...b,
    locked: !stored.unlockedBadges.includes(b.id),
  }));

  return {
    level,
    xp: stored.xp,
    xpIntoLevel,
    xpToNext,
    streakDays: stored.streakDays,
    badgeCount: stored.unlockedBadges.length,
    referralCode: GROWTH_REFERRAL_CODE,
    invitedUsers: stored.referralShares,
    rewardsEarned: stored.unlockedBadges.length * 15 + Object.keys(stored.claimedMissions).length * 10,
    daily,
    weekly,
    monthly,
    badges,
    stored,
  };
}

export function missionsForPeriod(snapshot: GrowthSnapshot, period: MissionPeriod): GrowthMissionMock[] {
  if (period === 'weekly') return snapshot.weekly;
  if (period === 'monthly') return snapshot.monthly;
  return snapshot.daily;
}
