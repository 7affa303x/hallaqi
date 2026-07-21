/**
 * Device-local growth progress (no backend / no DB tables).
 * Survives refresh; keyed per user when logged in.
 */

export interface GrowthStoredState {
  xp: number;
  streakDays: number;
  lastActiveDay: string | null;
  /** missionId -> ISO day when XP was claimed */
  claimedMissions: Record<string, string>;
  unlockedBadges: string[];
  referralShares: number;
  /** Local comment taps / soft progress when server comments are sparse */
  localForumComments: number;
  marketplaceProductViews: string[];
}

const PREFIX = 'hallaqi-growth-v1';

function storageKey(userId?: string | null): string {
  return userId ? `${PREFIX}:${userId}` : `${PREFIX}:anon`;
}

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function emptyState(): GrowthStoredState {
  return {
    xp: 0,
    streakDays: 0,
    lastActiveDay: null,
    claimedMissions: {},
    unlockedBadges: [],
    referralShares: 0,
    localForumComments: 0,
    marketplaceProductViews: [],
  };
}

export function loadGrowthState(userId?: string | null): GrowthStoredState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<GrowthStoredState>;
    return {
      ...emptyState(),
      ...parsed,
      claimedMissions: parsed.claimedMissions && typeof parsed.claimedMissions === 'object'
        ? parsed.claimedMissions
        : {},
      unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges.filter(x => typeof x === 'string') : [],
      marketplaceProductViews: Array.isArray(parsed.marketplaceProductViews)
        ? parsed.marketplaceProductViews.filter(x => typeof x === 'string')
        : [],
    };
  } catch {
    return emptyState();
  }
}

export function saveGrowthState(userId: string | null | undefined, state: GrowthStoredState): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

/** Update streak for opening/using the app today. */
export function touchGrowthStreak(userId?: string | null): GrowthStoredState {
  const state = loadGrowthState(userId);
  const today = todayKey();
  if (state.lastActiveDay === today) return state;

  if (!state.lastActiveDay) {
    state.streakDays = 1;
  } else {
    const prev = new Date(`${state.lastActiveDay}T12:00:00`);
    const cur = new Date(`${today}T12:00:00`);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    state.streakDays = diffDays === 1 ? state.streakDays + 1 : 1;
  }
  state.lastActiveDay = today;
  saveGrowthState(userId, state);
  return state;
}

export function recordReferralShare(userId?: string | null): GrowthStoredState {
  const state = loadGrowthState(userId);
  state.referralShares += 1;
  saveGrowthState(userId, state);
  return state;
}

export function recordLocalForumComment(userId?: string | null): GrowthStoredState {
  const state = loadGrowthState(userId);
  state.localForumComments += 1;
  saveGrowthState(userId, state);
  return state;
}

export function recordMarketplaceProductView(userId: string | null | undefined, productId: string): GrowthStoredState {
  const state = loadGrowthState(userId);
  if (!state.marketplaceProductViews.includes(productId)) {
    state.marketplaceProductViews = [...state.marketplaceProductViews, productId].slice(-50);
    saveGrowthState(userId, state);
  }
  return state;
}

export function claimMissionXp(
  userId: string | null | undefined,
  missionId: string,
  xpReward: number,
): GrowthStoredState {
  const state = loadGrowthState(userId);
  if (state.claimedMissions[missionId]) return state;
  state.claimedMissions[missionId] = todayKey();
  state.xp += xpReward;
  saveGrowthState(userId, state);
  return state;
}

export function unlockBadge(userId: string | null | undefined, badgeId: string): GrowthStoredState {
  const state = loadGrowthState(userId);
  if (!state.unlockedBadges.includes(badgeId)) {
    state.unlockedBadges = [...state.unlockedBadges, badgeId];
    state.xp += 15;
    saveGrowthState(userId, state);
  }
  return state;
}

export function xpToLevel(xp: number): { level: number; xpIntoLevel: number; xpToNext: number } {
  const perLevel = 100;
  const level = Math.floor(xp / perLevel) + 1;
  const xpIntoLevel = xp % perLevel;
  return { level, xpIntoLevel, xpToNext: perLevel };
}
