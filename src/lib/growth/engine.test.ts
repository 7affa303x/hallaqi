import { afterEach, describe, expect, it } from 'vitest';
import { buildGrowthSignals, evaluateGrowth } from '@/lib/growth/engine';
import { loadGrowthState, saveGrowthState } from '@/lib/growth/storage';

describe('growth engine (local)', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('awards streak and unlocks early badge when profile is complete', () => {
    const signals = buildGrowthSignals({
      userId: 'u1',
      fullName: 'أحمد',
      city: 'الجزائر',
      avatarUrl: 'https://example.com/a.png',
      bookings: [],
      forumPosts: [],
    });
    const snap = evaluateGrowth(signals);
    expect(snap.streakDays).toBeGreaterThanOrEqual(1);
    expect(snap.level).toBeGreaterThanOrEqual(1);
    expect(snap.daily.find(m => m.id === 'd3')?.done).toBe(true);
    expect(snap.daily.find(m => m.id === 'd1')?.done).toBe(true);
    expect(snap.badges.find(b => b.id === 'b8')?.locked).toBe(false);
  });

  it('counts referral shares from storage', () => {
    saveGrowthState('u2', {
      ...loadGrowthState('u2'),
      referralShares: 2,
    });
    const signals = buildGrowthSignals({
      userId: 'u2',
      fullName: 'سارة',
      city: 'وهران',
      avatarUrl: null,
      bookings: [],
      forumPosts: [],
    });
    const snap = evaluateGrowth(signals);
    expect(snap.weekly.find(m => m.id === 'w2')?.done).toBe(true);
    expect(snap.invitedUsers).toBe(2);
  });
});
