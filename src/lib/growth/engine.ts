/**
 * Compatibility façade — growth UI continues importing from @/lib/growth/*
 * while the real engine lives in @/lib/progression.
 */

export type { MissionType as MissionPeriod } from '@/lib/progression/models/types';
export type { ProgressionSignals as GrowthSignals, ProgressionSnapshot as GrowthSnapshot } from '@/lib/progression/models/types';
export {
  buildProgressionSignals as buildGrowthSignals,
  evaluateProgression as evaluateGrowth,
  missionsForPeriod,
} from '@/lib/progression';
