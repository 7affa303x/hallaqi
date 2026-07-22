import { ACHIEVEMENT_CATALOG } from '@/lib/progression/config/achievements';
import { criteriaMet, criteriaProgress, criteriaTarget } from '@/lib/progression/engines/criteria';
import type {
  AchievementDef,
  AchievementView,
  ProgressionSignals,
  StreakState,
  UserAchievementState,
} from '@/lib/progression/models/types';

export function evaluateNewAchievements(
  signals: ProgressionSignals,
  streak: StreakState,
  owned: UserAchievementState[],
  catalog: readonly AchievementDef[] = ACHIEVEMENT_CATALOG,
): AchievementDef[] {
  const earnedIds = new Set(owned.filter(a => a.earnedAt).map(a => a.achievementId));
  return catalog.filter(a => !earnedIds.has(a.id) && criteriaMet(a.criteria, signals, streak));
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
    const target = criteriaTarget(a.criteria);
    const progress = o?.earnedAt
      ? target
      : criteriaProgress(a.criteria, signals, streak);
    return {
      id: a.id,
      title: a.titleAr,
      description: a.descriptionAr,
      progress,
      target,
      earned: Boolean(o?.earnedAt),
      xpReward: a.xpReward,
    };
  });
}
