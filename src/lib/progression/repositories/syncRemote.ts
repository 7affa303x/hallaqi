/**
 * Merge remote Supabase progression state into local device cache.
 * Server wins for XP/streak when present; unions badges/achievements/missions.
 */

import { levelFromXp } from '@/lib/progression/config/levels';
import type { LocalProgressionState } from '@/lib/progression/repositories/localStore';
import {
  fetchMissionCatalog,
  fetchUserAchievements,
  fetchUserBadges,
  fetchUserMissions,
  fetchUserProgress,
  fetchUserStreak,
} from '@/lib/progression/repositories/remoteRepository';
import type {
  UserAchievementState,
  UserBadgeState,
  UserMissionState,
} from '@/lib/progression/models/types';

function mergeBadges(local: UserBadgeState[], remote: UserBadgeState[]): UserBadgeState[] {
  const map = new Map<string, UserBadgeState>();
  for (const b of local) map.set(b.badgeId, b);
  for (const b of remote) {
    const prev = map.get(b.badgeId);
    map.set(b.badgeId, prev ? {
      ...prev,
      earnedAt: b.earnedAt || prev.earnedAt,
      isPinned: b.isPinned ?? prev.isPinned,
      pinOrder: b.pinOrder ?? prev.pinOrder,
    } : b);
  }
  return [...map.values()];
}

function mergeAchievements(local: UserAchievementState[], remote: UserAchievementState[]): UserAchievementState[] {
  const map = new Map<string, UserAchievementState>();
  for (const a of local) map.set(a.achievementId, a);
  for (const a of remote) {
    const prev = map.get(a.achievementId);
    map.set(a.achievementId, {
      achievementId: a.achievementId,
      progress: Math.max(prev?.progress ?? 0, a.progress),
      earnedAt: a.earnedAt || prev?.earnedAt || null,
    });
  }
  return [...map.values()];
}

function mergeMissions(local: UserMissionState[], remote: UserMissionState[]): UserMissionState[] {
  const map = new Map<string, UserMissionState>();
  for (const m of local) map.set(`${m.missionId}:${m.periodKey}`, m);
  for (const m of remote) {
    const key = `${m.missionId}:${m.periodKey}`;
    const prev = map.get(key);
    map.set(key, prev ? {
      missionId: m.missionId,
      periodKey: m.periodKey,
      progress: Math.max(prev.progress, m.progress),
      target: m.target || prev.target,
      completed: prev.completed || m.completed,
      claimedAt: m.claimedAt || prev.claimedAt,
    } : m);
  }
  return [...map.values()];
}

export interface RemoteHydrationResult {
  ok: boolean;
  missionCatalogLoaded: boolean;
}

/** Pull server progression into local cache. Returns false when remote unavailable. */
export async function hydrateProgressionFromRemote(
  userId: string,
  local: LocalProgressionState,
): Promise<{ state: LocalProgressionState; result: RemoteHydrationResult }> {
  const [progress, streak, badges, achievements, missions, missionCatalog] = await Promise.all([
    fetchUserProgress(userId),
    fetchUserStreak(userId),
    fetchUserBadges(userId),
    fetchUserAchievements(userId),
    fetchUserMissions(userId),
    fetchMissionCatalog(),
  ]);

  const anyRemote = Boolean(progress || streak || badges || achievements || missions);
  if (!anyRemote && !missionCatalog) {
    return { state: local, result: { ok: false, missionCatalogLoaded: false } };
  }

  const next: LocalProgressionState = { ...local };

  if (progress) {
    next.progress = {
      userId,
      totalXp: Math.max(local.progress.totalXp, progress.totalXp),
      level: levelFromXp(Math.max(local.progress.totalXp, progress.totalXp)),
    };
  }

  if (streak) {
    next.streak = {
      currentStreak: Math.max(local.streak.currentStreak, streak.currentStreak),
      bestStreak: Math.max(local.streak.bestStreak, streak.bestStreak),
      lastActiveDate: streak.lastActiveDate || local.streak.lastActiveDate,
    };
  }

  if (badges) next.badges = mergeBadges(local.badges, badges);
  if (achievements) next.achievements = mergeAchievements(local.achievements, achievements);
  if (missions) next.missions = mergeMissions(local.missions, missions);

  return {
    state: next,
    result: {
      ok: anyRemote,
      missionCatalogLoaded: Boolean(missionCatalog && missionCatalog.length > 0),
    },
  };
}

export async function loadMissionCatalogFromRemote() {
  return fetchMissionCatalog();
}
