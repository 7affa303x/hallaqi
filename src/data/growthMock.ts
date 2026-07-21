/**
 * Growth catalog templates kept for UI copy / tests.
 * Live progress comes from @/lib/progression.
 */

import { BADGE_CATALOG } from '@/lib/progression/config/badges';
import { MISSION_CATALOG } from '@/lib/progression/config/missions';

export interface GrowthProgressMock {
  level: number;
  xp: number;
  xpToNext: number;
  streakDays: number;
  badgeCount: number;
}

export interface GrowthMissionMock {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  done: boolean;
}

export interface GrowthBadgeMock {
  id: string;
  name: string;
  description: string;
  emoji: string;
  locked: boolean;
  color: string;
}

export const GROWTH_PROGRESS_MOCK: GrowthProgressMock = {
  level: 1,
  xp: 0,
  xpToNext: 100,
  streakDays: 0,
  badgeCount: 0,
};

export const GROWTH_REFERRAL_CODE = 'HALLAQI-AB12';

export const GROWTH_REFERRAL_STATS_MOCK = {
  invitedUsers: 0,
  rewardsEarned: 0,
};

function toMissionMock(m: (typeof MISSION_CATALOG)[number]): GrowthMissionMock {
  return {
    id: m.id,
    title: m.titleAr,
    description: m.descriptionAr,
    progress: 0,
    target: m.target,
    done: false,
  };
}

export const DAILY_MISSIONS_MOCK = MISSION_CATALOG.filter(m => m.type === 'daily').map(toMissionMock);
export const WEEKLY_MISSIONS_MOCK = MISSION_CATALOG.filter(m => m.type === 'weekly').map(toMissionMock);
export const MONTHLY_MISSIONS_MOCK = MISSION_CATALOG.filter(m => m.type === 'monthly').map(toMissionMock);

export const GROWTH_BADGES_MOCK: GrowthBadgeMock[] = BADGE_CATALOG.slice(0, 8).map(b => ({
  id: b.id,
  name: b.nameAr,
  description: b.descriptionAr,
  emoji: b.emoji,
  locked: true,
  color: b.color,
}));
