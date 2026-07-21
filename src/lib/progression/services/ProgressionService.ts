/**
 * ProgressionService — single entry point for XP and progression mutations.
 *
 * All feature code should call this instead of editing XP/levels directly.
 * Prefer remote RPC when available; always keep a local ledger for offline / pre-migration.
 *
 * TODO(coins): awardCoins(userId, eventType, amount) parallel to awardXP when Reward Store ships.
 */

import { BADGE_CATALOG, MAX_PINNED_BADGES } from '@/lib/progression/config/badges';
import { levelFromXp } from '@/lib/progression/config/levels';
import type { XpEventType } from '@/lib/progression/config/xpEvents';
import { applyXpAward, type XpEngineState } from '@/lib/progression/engines/xpEngine';
import { touchStreak } from '@/lib/progression/engines/streakEngine';
import {
  migrateFromLegacyGrowth,
  saveLocalProgression,
  type LocalProgressionState,
} from '@/lib/progression/repositories/localStore';
import {
  remoteAwardXp,
  remoteTouchStreak,
  updateBadgePins,
  upsertUserAchievement,
  upsertUserBadge,
  upsertUserMission,
} from '@/lib/progression/repositories/remoteRepository';
import { hydrateProgressionFromRemote } from '@/lib/progression/repositories/syncRemote';
import type {
  AwardXpResult,
  UserAchievementState,
  UserBadgeState,
  UserMissionState,
} from '@/lib/progression/models/types';

function toXpState(local: LocalProgressionState): XpEngineState {
  return { totalXp: local.progress.totalXp, ledger: local.ledger };
}

const hydratedUsers = new Set<string>();

export const ProgressionService = {
  /** Load local state (with legacy growth migration). */
  load(userId?: string | null): LocalProgressionState {
    return migrateFromLegacyGrowth(userId);
  },

  /** Whether remote hydration completed for this user in this session. */
  isHydrated(userId?: string | null): boolean {
    return Boolean(userId && hydratedUsers.has(userId));
  },

  /**
   * Pull progression from Supabase into local cache (after migration is live).
   * Safe to call on login / profile open.
   */
  async hydrateFromRemote(userId: string): Promise<boolean> {
    const local = this.load(userId);
    const { state, result } = await hydrateProgressionFromRemote(userId, local);
    this.save(userId, state);
    if (result.ok) hydratedUsers.add(userId);
    return result.ok;
  },

  clearHydration(userId?: string | null): void {
    if (userId) hydratedUsers.delete(userId);
  },

  save(userId: string | null | undefined, state: LocalProgressionState): void {
    state.progress.level = levelFromXp(state.progress.totalXp);
    saveLocalProgression(userId, state);
  },

  /** Synchronous local XP award — used during snapshot evaluation (render-safe). */
  awardXPLocal(
    userId: string | null | undefined,
    eventType: XpEventType,
    amount?: number,
    options?: { dedupeKey?: string | null; metadata?: Record<string, unknown> },
  ): AwardXpResult {
    const local = this.load(userId);
    const applied = applyXpAward(toXpState(local), eventType, {
      amount,
      dedupeKey: options?.dedupeKey,
      metadata: options?.metadata,
    });
    if (applied.result.ok) {
      local.progress.totalXp = applied.state.totalXp;
      local.progress.level = applied.result.level;
      local.ledger = applied.state.ledger;
      this.save(userId, local);
      if (userId) {
        void remoteAwardXp(eventType, applied.result.amount, options?.dedupeKey, options?.metadata).then((remote) => {
          if (remote?.ok && typeof remote.total_xp === 'number') {
            const latest = this.load(userId);
            latest.progress.totalXp = Math.max(latest.progress.totalXp, remote.total_xp);
            latest.progress.level = levelFromXp(latest.progress.totalXp);
            this.save(userId, latest);
          }
        });
      }
    }
    return applied.result;
  },

  /**
   * Award XP for a supported event.
   * amount is optional — defaults come from config/xpEvents.ts
   */
  async awardXP(
    userId: string | null | undefined,
    eventType: XpEventType,
    amount?: number,
    options?: { dedupeKey?: string | null; metadata?: Record<string, unknown> },
  ): Promise<AwardXpResult> {
    if (userId) {
      const remote = await remoteAwardXp(eventType, amount, options?.dedupeKey, options?.metadata);
      if (remote?.ok && typeof remote.total_xp === 'number') {
        const local = this.load(userId);
        local.progress.totalXp = remote.total_xp;
        local.progress.level = remote.level ?? levelFromXp(remote.total_xp);
        this.save(userId, local);
        return {
          ok: true,
          amount: remote.amount ?? amount ?? 0,
          totalXp: remote.total_xp,
          level: local.progress.level,
          eventType,
        };
      }
      if (remote && !remote.ok && remote.reason === 'duplicate') {
        await this.hydrateFromRemote(userId);
        const refreshed = this.load(userId);
        return {
          ok: false,
          amount: 0,
          totalXp: refreshed.progress.totalXp,
          level: refreshed.progress.level,
          reason: 'duplicate',
          eventType,
        };
      }
    }
    return this.awardXPLocal(userId, eventType, amount, options);
  },

  /**
   * Sync streak for daily activity.
   * Local streak + daily_login XP apply synchronously; remote sync is best-effort.
   */
  touchDailyActivity(userId?: string | null) {
    const local = this.load(userId);
    local.streak = touchStreak(local.streak);
    this.save(userId, local);
    this.awardXPLocal(userId, 'daily_login', undefined, {
      dedupeKey: `daily_login:${new Date().toISOString().slice(0, 10)}`,
    });
    if (userId) {
      void remoteTouchStreak().then((remote) => {
        if (!remote) return;
        const latest = this.load(userId);
        latest.streak = {
          currentStreak: Math.max(latest.streak.currentStreak, remote.currentStreak),
          bestStreak: Math.max(latest.streak.bestStreak, remote.bestStreak),
          lastActiveDate: remote.lastActiveDate || latest.streak.lastActiveDate,
        };
        this.save(userId, latest);
      });
    }
    return local.streak;
  },

  async unlockBadge(userId: string | null | undefined, badgeId: string): Promise<LocalProgressionState> {
    const local = this.load(userId);
    if (local.badges.some(b => b.badgeId === badgeId)) return local;
    const def = BADGE_CATALOG.find(b => b.id === badgeId);
    const row: UserBadgeState = {
      badgeId,
      earnedAt: new Date().toISOString(),
      isPinned: local.badges.filter(b => b.isPinned).length < MAX_PINNED_BADGES,
      pinOrder: local.badges.filter(b => b.isPinned).length + 1,
    };
    if (!row.isPinned) row.pinOrder = null;
    local.badges = [...local.badges, row];
    this.save(userId, local);
    if (def && def.xpBonus > 0) {
    void this.awardXP(userId, 'badge_bonus', def.xpBonus, {
        dedupeKey: `badge_bonus:${badgeId}`,
        metadata: { badgeId },
      });
    }
    if (userId) void upsertUserBadge(userId, row);
    return this.load(userId);
  },

  async unlockAchievement(
    userId: string | null | undefined,
    achievementId: string,
    xpReward: number,
    progress: number,
  ): Promise<LocalProgressionState> {
    const local = this.load(userId);
    const existing = local.achievements.find(a => a.achievementId === achievementId);
    if (existing?.earnedAt) return local;
    const row: UserAchievementState = {
      achievementId,
      progress,
      earnedAt: new Date().toISOString(),
    };
    local.achievements = [
      ...local.achievements.filter(a => a.achievementId !== achievementId),
      row,
    ];
    this.save(userId, local);
    if (xpReward > 0) {
    void this.awardXP(userId, 'achievement_reward', xpReward, {
        dedupeKey: `achievement:${achievementId}`,
        metadata: { achievementId },
      });
    }
    if (userId) void upsertUserAchievement(userId, row);
    return this.load(userId);
  },

  async syncMission(
    userId: string | null | undefined,
    mission: UserMissionState,
  ): Promise<LocalProgressionState> {
    const local = this.load(userId);
    const key = `${mission.missionId}:${mission.periodKey}`;
    local.missions = [
      ...local.missions.filter(m => `${m.missionId}:${m.periodKey}` !== key),
      mission,
    ];
    this.save(userId, local);
    if (userId) void upsertUserMission(userId, mission);
    return local;
  },

  async claimMissionReward(
    userId: string | null | undefined,
    missionId: string,
    periodKey: string,
    xpReward: number,
  ): Promise<AwardXpResult> {
    const local = this.load(userId);
    const row = local.missions.find(m => m.missionId === missionId && m.periodKey === periodKey);
    if (row?.claimedAt) {
      return {
        ok: false,
        amount: 0,
        totalXp: local.progress.totalXp,
        level: local.progress.level,
        reason: 'already_claimed',
        eventType: 'mission_reward',
      };
    }
    const next: UserMissionState = {
      missionId,
      periodKey,
      progress: row?.progress ?? 0,
      target: row?.target ?? 1,
      completed: true,
      claimedAt: new Date().toISOString(),
    };
    await this.syncMission(userId, next);
    return this.awardXP(userId, 'mission_reward', xpReward, {
      dedupeKey: `mission:${missionId}:${periodKey}`,
      metadata: { missionId, periodKey },
    });
  },

  recordReferralShare(userId?: string | null, kind: 'customer' | 'barber' | 'generic' = 'generic'): LocalProgressionState {
    const local = this.load(userId);
    local.referralShares += 1;
    if (kind === 'customer') local.inviteCustomerCount += 1;
    if (kind === 'barber') local.inviteBarberCount += 1;
    this.save(userId, local);
    void this.awardXP(
      userId,
      kind === 'barber' ? 'invite_barber' : 'invite_customer',
      undefined,
      { dedupeKey: `invite:${kind}:${local.referralShares}:${new Date().toISOString().slice(0, 10)}` },
    );
    return local;
  },

  recordLocalForumComment(userId?: string | null): LocalProgressionState {
    const local = this.load(userId);
    local.localForumComments += 1;
    this.save(userId, local);
    void this.awardXP(userId, 'create_comment', undefined, {
      dedupeKey: `create_comment:${new Date().toISOString().slice(0, 10)}`,
    });
    return local;
  },

  recordMarketplaceProductView(userId: string | null | undefined, productId: string): LocalProgressionState {
    const local = this.load(userId);
    if (!local.marketplaceProductViews.includes(productId)) {
      local.marketplaceProductViews = [...local.marketplaceProductViews, productId].slice(-50);
      this.save(userId, local);
    }
    return local;
  },

  async setPinnedBadges(userId: string | null | undefined, badgeIds: string[]): Promise<LocalProgressionState> {
    const ids = badgeIds.slice(0, MAX_PINNED_BADGES);
    const local = this.load(userId);
    local.badges = local.badges.map((b) => {
      const idx = ids.indexOf(b.badgeId);
      if (idx >= 0) return { ...b, isPinned: true, pinOrder: idx + 1 };
      return { ...b, isPinned: false, pinOrder: null };
    });
    this.save(userId, local);
    if (userId) {
      void updateBadgePins(
        userId,
        local.badges.map(b => ({ badgeId: b.badgeId, isPinned: b.isPinned, pinOrder: b.pinOrder })),
      );
    }
    return local;
  },
};
