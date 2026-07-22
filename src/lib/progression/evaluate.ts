/**
 * Orchestrates XP / levels / badges / achievements / missions / streaks
 * from app activity signals — without mutating booking/auth/forum modules.
 */

import { achievementsForRole } from '@/lib/progression/config/achievements';
import { badgeCatalogForRole } from '@/lib/progression/badgeAudience';
import { getMissionCatalogSync } from '@/lib/progression/missionCatalog';
import { getLevelProgress } from '@/lib/progression/config/levels';
import { evaluateNewAchievements, toAchievementViews } from '@/lib/progression/engines/achievementEngine';
import { criteriaProgress } from '@/lib/progression/engines/criteria';
import { evaluateNewBadges, pinnedBadgeViews, toBadgeViews } from '@/lib/progression/engines/badgeEngine';
import {
  buildMissionViews,
  missionsOfType,
  periodKeyFor,
} from '@/lib/progression/engines/missionEngine';
import { ProgressionService } from '@/lib/progression/services/ProgressionService';
import type {
  ProgressionSignals,
  ProgressionSnapshot,
  UserMissionState,
} from '@/lib/progression/models/types';
import type { Booking } from '@/types';

function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function buildProgressionSignals(input: {
  userId?: string | null;
  fullName?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  isVerified?: boolean;
  galleryPhotoCount?: number;
  galleryCompleted?: boolean;
  bookings: Booking[];
  forumPosts: { authorId: string; comments?: { authorId: string; createdAt?: string }[]; createdAt?: string }[];
}): ProgressionSignals {
  const stored = ProgressionService.load(input.userId);
  const uid = input.userId || '';
  const weekStart = startOfWeek().getTime();
  const monthStart = startOfMonth().getTime();
  const dayStart = startOfDay().getTime();

  const inRange = (iso: string | undefined, from: number) => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return Number.isFinite(t) && t >= from;
  };

  const forumCommentCount =
    input.forumPosts.reduce((sum, post) => {
      const comments = post.comments || [];
      return sum + comments.filter(c => c.authorId === uid).length;
    }, 0) + stored.localForumComments;

  const forumCommentToday =
    input.forumPosts.reduce((sum, post) => {
      const comments = post.comments || [];
      return sum + comments.filter(c => c.authorId === uid && inRange(c.createdAt, dayStart)).length;
    }, 0) + (stored.localForumComments > 0 ? 1 : 0);

  const forumPostCount = input.forumPosts.filter(p => p.authorId === uid).length;
  const forumPostsThisWeek = input.forumPosts.filter(
    p => p.authorId === uid && inRange(p.createdAt, weekStart),
  ).length;

  const galleryCount = input.galleryPhotoCount ?? 0;

  return {
    userId: input.userId,
    hasAvatar: Boolean(input.avatarUrl && !String(input.avatarUrl).endsWith('/logo-icon.svg')),
    hasCompleteProfile: Boolean(
      (input.fullName || '').trim().length >= 2 && (input.city || '').trim().length >= 2,
    ),
    phoneVerified: Boolean(input.phoneVerified || ((input.phone || '').replace(/\D/g, '').length >= 9)),
    galleryPhotoCount: galleryCount,
    galleryCompleted: Boolean(input.galleryCompleted || galleryCount >= 6),
    galleryUpdatedThisMonth: galleryCount > 0,
    forumCommentCount,
    forumCommentToday,
    forumPostCount,
    forumPostsThisWeek,
    bookingsThisWeek: input.bookings.filter(b => inRange(b.createdAt, weekStart)).length,
    bookingsThisMonth: input.bookings.filter(b => inRange(b.createdAt, monthStart)).length,
    completedBookings: input.bookings.filter(b => b.status === 'completed').length,
    reviewedBookings: input.bookings.filter(
      b => b.reviewed || (typeof b.rating === 'number' && b.rating > 0),
    ).length,
    reviewsToday: input.bookings.filter(
      b => (b.reviewed || (typeof b.rating === 'number' && b.rating > 0)) && inRange(b.createdAt, dayStart),
    ).length,
    referralShares: stored.referralShares,
    inviteCustomerCount: stored.inviteCustomerCount,
    inviteBarberCount: stored.inviteBarberCount,
    isVerified: Boolean(input.isVerified),
    isTrusted: Boolean(input.isVerified) || input.bookings.filter(b => b.status === 'completed').length >= 3,
    isEarlySupporter: true, // soft launch cohort
  };
}

/**
 * Evaluate full progression snapshot and persist side-effects (XP/badges/missions).
 * Safe to call from React render paths — mutations are idempotent via dedupe keys.
 */
export function evaluateProgression(signals: ProgressionSignals, userRole?: string | null): ProgressionSnapshot {
  const roleCatalog = badgeCatalogForRole(userRole);
  ProgressionService.touchDailyActivity(signals.userId);

  // Milestone XP from profile/gallery (deduped, sync local + async remote)
  if (signals.hasCompleteProfile) {
    ProgressionService.awardXPLocal(signals.userId, 'complete_profile', undefined, {
      dedupeKey: `complete_profile:${signals.userId || 'anon'}`,
    });
  }
  if (signals.phoneVerified) {
    ProgressionService.awardXPLocal(signals.userId, 'phone_verification', undefined, {
      dedupeKey: `phone_verification:${signals.userId || 'anon'}`,
    });
  }
  if (signals.galleryPhotoCount >= 1) {
    ProgressionService.awardXPLocal(signals.userId, 'first_gallery_photo', undefined, {
      dedupeKey: `first_gallery_photo:${signals.userId || 'anon'}`,
    });
  }
  if (signals.galleryCompleted) {
    ProgressionService.awardXPLocal(signals.userId, 'gallery_completed', undefined, {
      dedupeKey: `gallery_completed:${signals.userId || 'anon'}`,
    });
  }
  if (signals.forumPostCount >= 1) {
    ProgressionService.awardXPLocal(signals.userId, 'create_post', undefined, {
      dedupeKey: `create_post:${new Date().toISOString().slice(0, 10)}`,
    });
  }

  let local = ProgressionService.load(signals.userId);

  // Badges
  const newBadges = evaluateNewBadges(signals, local.streak, local.badges, roleCatalog);
  for (const b of newBadges) {
    void ProgressionService.unlockBadge(signals.userId, b.id);
  }

  // Achievements — bronze / silver / gold tiers (2 / 5 / 10)
  const roleAchievements = achievementsForRole(userRole);
  local = ProgressionService.load(signals.userId);
  const newAch = evaluateNewAchievements(signals, local.streak, local.achievements, roleAchievements);
  for (const a of newAch) {
    const progress = criteriaProgress(a.criteria, signals, local.streak);
    void ProgressionService.syncAchievementTiers(signals.userId, a.id, progress);
  }

  local = ProgressionService.load(signals.userId);
  const missionCatalog = getMissionCatalogSync();
  const missionViews = buildMissionViews(signals, local.missions, missionCatalog);

  // Persist mission progress + claim rewards
  for (const m of missionViews) {
    const pk = periodKeyFor(m.type);
    const row: UserMissionState = {
      missionId: m.id,
      periodKey: pk,
      progress: m.progress,
      target: m.target,
      completed: m.done,
      claimedAt: m.claimed ? local.missions.find(x => x.missionId === m.id && x.periodKey === pk)?.claimedAt ?? new Date().toISOString() : null,
    };
    void ProgressionService.syncMission(signals.userId, row);
    if (m.done && !m.claimed && m.xpReward > 0) {
      void ProgressionService.claimMissionReward(signals.userId, m.id, pk, m.xpReward);
    }
  }

  local = ProgressionService.load(signals.userId);
  const refreshedMissions = buildMissionViews(signals, local.missions, missionCatalog);
  const level = getLevelProgress(local.progress.totalXp);
  const badges = toBadgeViews(roleCatalog, local.badges);
  const achievements = toAchievementViews(roleAchievements, local.achievements, signals, local.streak);
  const pinned = pinnedBadgeViews(badges);

  return {
    level: level.level,
    xp: level.totalXp,
    xpIntoLevel: level.xpIntoLevel,
    xpToNext: level.xpToNext,
    streakDays: local.streak.currentStreak,
    bestStreak: local.streak.bestStreak,
    badgeCount: local.badges.length,
    pinnedBadges: pinned,
    badges,
    achievements,
    daily: missionsOfType(refreshedMissions, 'daily'),
    weekly: missionsOfType(refreshedMissions, 'weekly'),
    monthly: missionsOfType(refreshedMissions, 'monthly'),
    seasonal: missionsOfType(refreshedMissions, 'seasonal'),
    invitedUsers: local.referralShares,
    referralCode: `HALLAQI-${(signals.userId || 'GUEST').replace(/-/g, '').slice(0, 4).toUpperCase()}`,
    rewardsEarned: local.badges.length * 15 + local.achievements.filter(a => a.earnedAt).length * 10,
  };
}

export function missionsForPeriod(
  snapshot: ProgressionSnapshot,
  period: 'daily' | 'weekly' | 'monthly' | 'seasonal',
) {
  if (period === 'weekly') return snapshot.weekly;
  if (period === 'monthly') return snapshot.monthly;
  if (period === 'seasonal') return snapshot.seasonal;
  return snapshot.daily;
}
