/**
 * Configurable level progression table.
 * Level is always derived from total XP — never stored as source of truth in UI.
 */

/** Cumulative XP required to *reach* each level (1-indexed). */
export const LEVEL_THRESHOLDS: readonly number[] = [
  0, // Level 1
  100, // 2
  250, // 3
  500, // 4
  900, // 5
  1500, // 6
  2400, // 7
  3700, // 8
  5500, // 9
  8000, // 10
  11200, // 11
  15200, // 12
  20200, // 13
  26200, // 14
  33500, // 15
  42200, // 16
  52500, // 17
  64500, // 18
  78500, // 19
  95000, // 20
] as const;

const GROWTH = 1.45;

function thresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level - 1 < LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1]!;
  let xp = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]!;
  for (let l = LEVEL_THRESHOLDS.length + 1; l <= level; l++) {
    xp += Math.max(100, Math.floor(100 * GROWTH ** Math.max(l - 2, 0)));
  }
  return xp;
}

export interface LevelProgress {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpToNext: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressRatio: number;
}

export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  for (let l = 2; l <= 200; l++) {
    if (xp >= thresholdForLevel(l)) level = l;
    else break;
  }
  return level;
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp || 0));
  const level = levelFromXp(xp);
  const xpForCurrentLevel = thresholdForLevel(level);
  const xpForNextLevel = thresholdForLevel(level + 1);
  const xpIntoLevel = xp - xpForCurrentLevel;
  const xpToNext = Math.max(1, xpForNextLevel - xpForCurrentLevel);
  return {
    level,
    totalXp: xp,
    xpIntoLevel,
    xpToNext,
    xpForCurrentLevel,
    xpForNextLevel,
    progressRatio: Math.min(1, xpIntoLevel / xpToNext),
  };
}
