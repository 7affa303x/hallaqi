import { ACHIEVEMENT_CATALOG } from '@/lib/progression/config/achievements';
import { criteriaMet, criteriaProgress, criteriaTarget } from '@/lib/progression/engines/criteria';
import type {
  AchievementDef,
  AchievementView,
  ProgressionSignals,
  StreakState,
  UserAchievementState,
} from '@/lib/progression/models/types';

export function tierState(progress: number, tiers: AchievementDef['tiers']) {
  let completedTiers = 0;
  for (const tier of tiers) {
    if (progress >= tier.target) completedTiers += 1;
    else break;
  }
  const activeTier = Math.min(tiers.length, completedTiers + 1);
  const activeTierTarget = tiers[activeTier - 1]?.target ?? tiers[tiers.length - 1]?.target ?? 1;
  const maxTarget = tiers[tiers.length - 1]?.target ?? criteriaTarget({ completedBookings: 1 });
  return {
    completedTiers,
    activeTier,
    activeTierTarget,
    maxTarget,
    earned: completedTiers >= tiers.length,
    tierTargets: tiers.map(t => t.target),
    tierMetals: tiers.map(t => t.tier),
    coinReward: tiers[Math.max(0, completedTiers - 1)]?.coinReward ?? tiers[0]?.coinReward ?? 0,
    xpReward: tiers[Math.max(0, completedTiers - 1)]?.xpReward ?? tiers[0]?.xpReward ?? 0,
  };
}

function storedCompletedTiers(
  owned: UserAchievementState | undefined,
  maxTiers: number,
): number {
  if (!owned) return 0;
  if (typeof owned.completedTiers === 'number') return owned.completedTiers;
  return owned.earnedAt ? maxTiers : 0;
}

export function evaluateNewAchievements(
  signals: ProgressionSignals,
  streak: StreakState,
  owned: UserAchievementState[],
  catalog: readonly AchievementDef[] = ACHIEVEMENT_CATALOG,
): AchievementDef[] {
  const byId = new Map(owned.map(a => [a.achievementId, a]));
  return catalog.filter((a) => {
    const progress = criteriaProgress(a.criteria, signals, streak);
    const { completedTiers } = tierState(progress, a.tiers);
    const stored = storedCompletedTiers(byId.get(a.id), a.tiers.length);
    return completedTiers > stored || criteriaMet(a.criteria, signals, streak);
  });
}

export function toAchievementViews(
  catalog: readonly AchievementDef[],
  owned: UserAchievementState[],
  signals: ProgressionSignals,
  streak: StreakState,
): AchievementView[] {
  const byId = new Map(owned.map(o => [o.achievementId, o]));
  return catalog.map((a) => {
    const o = byId.get(a.id);
    const progress = Math.max(o?.progress ?? 0, criteriaProgress(a.criteria, signals, streak));
    const tier = tierState(progress, a.tiers);
    const storedTiers = storedCompletedTiers(o, a.tiers.length);
    return {
      id: a.id,
      title: a.titleAr,
      description: a.descriptionAr,
      audience: a.audience,
      category: a.category,
      progress,
      target: tier.earned ? tier.maxTarget : tier.activeTierTarget,
      earned: tier.earned || storedTiers >= a.tiers.length,
      xpReward: tier.xpReward,
      coinReward: tier.coinReward,
      completedTiers: Math.max(storedTiers, tier.completedTiers),
      maxTiers: a.tiers.length,
      activeTier: tier.activeTier,
      activeTierTarget: tier.activeTierTarget,
      tierTargets: tier.tierTargets,
      tierMetals: tier.tierMetals,
    };
  });
}
