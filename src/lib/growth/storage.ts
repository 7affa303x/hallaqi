/**
 * Compatibility façade over local progression store.
 * Prefer ProgressionService for new code.
 */

import { ProgressionService } from '@/lib/progression';
import { getLevelProgress } from '@/lib/progression/config/levels';
import {
  loadLocalProgression,
  type LocalProgressionState,
} from '@/lib/progression/repositories/localStore';

/** @deprecated Use LocalProgressionState / ProgressionService */
export type GrowthStoredState = {
  xp: number;
  streakDays: number;
  lastActiveDay: string | null;
  claimedMissions: Record<string, string>;
  unlockedBadges: string[];
  referralShares: number;
  localForumComments: number;
  marketplaceProductViews: string[];
};

function toLegacy(state: LocalProgressionState): GrowthStoredState {
  const claimed: Record<string, string> = {};
  for (const m of state.missions) {
    if (m.claimedAt) claimed[m.missionId] = m.claimedAt;
  }
  return {
    xp: state.progress.totalXp,
    streakDays: state.streak.currentStreak,
    lastActiveDay: state.streak.lastActiveDate,
    claimedMissions: claimed,
    unlockedBadges: state.badges.map(b => b.badgeId),
    referralShares: state.referralShares,
    localForumComments: state.localForumComments,
    marketplaceProductViews: state.marketplaceProductViews,
  };
}

export function loadGrowthState(userId?: string | null): GrowthStoredState {
  return toLegacy(ProgressionService.load(userId));
}

export function saveGrowthState(userId: string | null | undefined, state: GrowthStoredState): void {
  const local = ProgressionService.load(userId);
  local.progress.totalXp = state.xp;
  local.streak.currentStreak = state.streakDays;
  local.streak.lastActiveDate = state.lastActiveDay;
  local.referralShares = state.referralShares;
  local.localForumComments = state.localForumComments;
  local.marketplaceProductViews = state.marketplaceProductViews;
  ProgressionService.save(userId, local);
}

export function touchGrowthStreak(userId?: string | null): GrowthStoredState {
  void ProgressionService.touchDailyActivity(userId);
  return loadGrowthState(userId);
}

export function recordReferralShare(userId?: string | null): GrowthStoredState {
  ProgressionService.recordReferralShare(userId, 'customer');
  return loadGrowthState(userId);
}

export function recordLocalForumComment(userId?: string | null): GrowthStoredState {
  ProgressionService.recordLocalForumComment(userId);
  return loadGrowthState(userId);
}

export function recordMarketplaceProductView(userId: string | null | undefined, productId: string): GrowthStoredState {
  ProgressionService.recordMarketplaceProductView(userId, productId);
  return loadGrowthState(userId);
}

export function claimMissionXp(
  userId: string | null | undefined,
  missionId: string,
  xpReward: number,
): GrowthStoredState {
  const day = new Date().toISOString().slice(0, 10);
  void ProgressionService.claimMissionReward(userId, missionId, day, xpReward);
  return loadGrowthState(userId);
}

export function unlockBadge(userId: string | null | undefined, badgeId: string): GrowthStoredState {
  void ProgressionService.unlockBadge(userId, badgeId);
  return loadGrowthState(userId);
}

export function xpToLevel(xp: number): { level: number; xpIntoLevel: number; xpToNext: number } {
  const p = getLevelProgress(xp);
  return { level: p.level, xpIntoLevel: p.xpIntoLevel, xpToNext: p.xpToNext };
}

export function loadRawLocal(userId?: string | null) {
  return loadLocalProgression(userId);
}
