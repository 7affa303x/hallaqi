import { describe, expect, it } from 'vitest';
import {
  DAILY_MISSIONS_MOCK,
  GROWTH_BADGES_MOCK,
  GROWTH_PROGRESS_MOCK,
  GROWTH_REFERRAL_CODE,
  MONTHLY_MISSIONS_MOCK,
  WEEKLY_MISSIONS_MOCK,
} from '@/data/growthMock';

describe('growthMock UI shell data', () => {
  it('keeps progress at Level 1 / 0 XP placeholders', () => {
    expect(GROWTH_PROGRESS_MOCK).toEqual({
      level: 1,
      xp: 0,
      xpToNext: 100,
      streakDays: 0,
      badgeCount: 0,
    });
  });

  it('provides mission sections and eight showcase badges', () => {
    expect(DAILY_MISSIONS_MOCK.length).toBeGreaterThan(0);
    expect(WEEKLY_MISSIONS_MOCK.length).toBeGreaterThan(0);
    expect(MONTHLY_MISSIONS_MOCK.length).toBeGreaterThan(0);
    expect(GROWTH_BADGES_MOCK).toHaveLength(8);
    expect(GROWTH_REFERRAL_CODE).toBe('HALLAQI-AB12');
  });
});
