/**
 * Progression Engine public API.
 *
 * Modular XP / Levels / Badges / Achievements / Missions / Streaks.
 * Coins & Reward Store intentionally not implemented — see TODO(coins).
 */

export { ProgressionService } from '@/lib/progression/services/ProgressionService';
export { XP_REWARDS, XP_EVENT_TYPES, type XpEventType } from '@/lib/progression/config/xpEvents';
export { LEVEL_THRESHOLDS, getLevelProgress, levelFromXp } from '@/lib/progression/config/levels';
export { LEVEL_UNLOCKS, unlocksForLevel, nextUnlock } from '@/lib/progression/config/unlocks';
export { BADGE_CATALOG, MAX_PINNED_BADGES } from '@/lib/progression/config/badges';
export { ACHIEVEMENT_CATALOG } from '@/lib/progression/config/achievements';
export { MISSION_CATALOG, missionsByType } from '@/lib/progression/config/missions';
export {
  buildProgressionSignals,
  evaluateProgression,
  missionsForPeriod,
} from '@/lib/progression/evaluate';
export { getActiveMissionCatalog, getMissionCatalogSync } from '@/lib/progression/missionCatalog';
export type {
  ProgressionSnapshot,
  ProgressionSignals,
  MissionView,
  BadgeView,
  AchievementView,
  MissionType,
} from '@/lib/progression/models/types';
