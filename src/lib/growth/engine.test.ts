import { afterEach, describe, expect, it } from 'vitest';
import { buildGrowthSignals, evaluateGrowth } from '@/lib/growth/engine';
import { ProgressionService } from '@/lib/progression';

describe('growth façade → progression engine', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('awards streak and completes avatar mission', () => {
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
    expect(snap.daily.find(m => m.id === 'daily_photo')?.done).toBe(true);
  });

  it('counts referral shares', () => {
    ProgressionService.recordReferralShare('u2', 'customer');
    ProgressionService.recordReferralShare('u2', 'customer');
    const signals = buildGrowthSignals({
      userId: 'u2',
      fullName: 'سارة',
      city: 'وهران',
      avatarUrl: null,
      bookings: [],
      forumPosts: [],
    });
    const snap = evaluateGrowth(signals);
    expect(snap.weekly.find(m => m.id === 'weekly_invite')?.done).toBe(true);
    expect(snap.invitedUsers).toBe(2);
  });
});
