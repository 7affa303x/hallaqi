/**
 * Device-local progression persistence (fallback when Supabase tables are unavailable).
 * Keyed per user. Survives refresh.
 */

import type { XpEventType } from '@/lib/progression/config/xpEvents';
import type { XpLedgerEntry } from '@/lib/progression/engines/xpEngine';
import type {
  ProgressState,
  StreakState,
  UserAchievementState,
  UserBadgeState,
  UserMissionState,
} from '@/lib/progression/models/types';

export interface LocalProgressionState {
  progress: ProgressState;
  streak: StreakState;
  ledger: XpLedgerEntry[];
  badges: UserBadgeState[];
  achievements: UserAchievementState[];
  missions: UserMissionState[];
  referralShares: number;
  inviteCustomerCount: number;
  inviteBarberCount: number;
  localForumComments: number;
  marketplaceProductViews: string[];
}

const PREFIX = 'hallaqi-progression-v1';

function storageKey(userId?: string | null): string {
  return userId ? `${PREFIX}:${userId}` : `${PREFIX}:anon`;
}

function empty(userId = 'anon'): LocalProgressionState {
  return {
    progress: { userId, totalXp: 0, level: 1 },
    streak: { currentStreak: 0, bestStreak: 0, lastActiveDate: null },
    ledger: [],
    badges: [],
    achievements: [],
    missions: [],
    referralShares: 0,
    inviteCustomerCount: 0,
    inviteBarberCount: 0,
    localForumComments: 0,
    marketplaceProductViews: [],
  };
}

export function loadLocalProgression(userId?: string | null): LocalProgressionState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return empty(userId || 'anon');
    const parsed = JSON.parse(raw) as Partial<LocalProgressionState>;
    const base = empty(userId || 'anon');
    return {
      ...base,
      ...parsed,
      progress: { ...base.progress, ...parsed.progress, userId: userId || 'anon' },
      streak: { ...base.streak, ...parsed.streak },
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger as XpLedgerEntry[] : [],
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      missions: Array.isArray(parsed.missions) ? parsed.missions : [],
      marketplaceProductViews: Array.isArray(parsed.marketplaceProductViews)
        ? parsed.marketplaceProductViews.filter(x => typeof x === 'string')
        : [],
    };
  } catch {
    return empty(userId || 'anon');
  }
}

export function saveLocalProgression(userId: string | null | undefined, state: LocalProgressionState): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

/** One-time migrate from older growth-v1 storage if present. */
export function migrateFromLegacyGrowth(userId?: string | null): LocalProgressionState {
  const current = loadLocalProgression(userId);
  if (current.progress.totalXp > 0 || current.ledger.length > 0) return current;
  try {
    const legacyKey = userId ? `hallaqi-growth-v1:${userId}` : 'hallaqi-growth-v1:anon';
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return current;
    const legacy = JSON.parse(raw) as {
      xp?: number;
      streakDays?: number;
      lastActiveDay?: string | null;
      unlockedBadges?: string[];
      claimedMissions?: Record<string, string>;
      referralShares?: number;
      localForumComments?: number;
      marketplaceProductViews?: string[];
    };
    const next: LocalProgressionState = {
      ...current,
      progress: {
        userId: userId || 'anon',
        totalXp: Math.max(0, legacy.xp || 0),
        level: 1,
      },
      streak: {
        currentStreak: Math.max(0, legacy.streakDays || 0),
        bestStreak: Math.max(0, legacy.streakDays || 0),
        lastActiveDate: legacy.lastActiveDay || null,
      },
      badges: (legacy.unlockedBadges || []).map((id, i) => ({
        badgeId: id,
        earnedAt: new Date().toISOString(),
        isPinned: i < 8,
        pinOrder: i < 8 ? i + 1 : null,
      })),
      referralShares: legacy.referralShares || 0,
      localForumComments: legacy.localForumComments || 0,
      marketplaceProductViews: legacy.marketplaceProductViews || [],
      missions: Object.entries(legacy.claimedMissions || {}).map(([missionId, claimedAt]) => ({
        missionId,
        periodKey: String(claimedAt).slice(0, 10),
        progress: 1,
        target: 1,
        completed: true,
        claimedAt: String(claimedAt),
      })),
    };
    if (legacy.xp && legacy.xp > 0) {
      next.ledger.push({
        eventType: 'daily_login' as XpEventType,
        amount: legacy.xp,
        dedupeKey: 'legacy-growth-import',
        createdAt: new Date().toISOString(),
        metadata: { migrated: true },
      });
    }
    saveLocalProgression(userId, next);
    return next;
  } catch {
    return current;
  }
}
