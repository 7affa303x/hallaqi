import { getLevelProgress, levelFromXp } from '@/lib/progression/config/levels';
import { unlocksForLevel, nextUnlock, type LevelUnlockDef } from '@/lib/progression/config/unlocks';

export const LevelEngine = {
  fromXp: levelFromXp,
  progress: getLevelProgress,
  unlocksAt: unlocksForLevel,
  nextUnlock,
};

export type { LevelUnlockDef };
