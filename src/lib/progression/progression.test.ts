import { afterEach, describe, expect, it } from 'vitest';
import { buildProgressionSignals, evaluateProgression, ProgressionService } from '@/lib/progression';
import { getLevelProgress, levelFromXp } from '@/lib/progression/config/levels';
import { xpAmountFor } from '@/lib/progression/config/xpEvents';
import { applyXpAward } from '@/lib/progression/engines/xpEngine';
import { touchStreak } from '@/lib/progression/engines/streakEngine';

describe('progression xp config', () => {
  it('exposes configured event amounts', () => {
    expect(xpAmountFor('first_booking')).toBe(20);
    expect(xpAmountFor('completed_booking')).toBe(10);
    expect(xpAmountFor('invite_barber')).toBe(50);
    expect(xpAmountFor('create_comment')).toBe(2);
  });
});

describe('level engine', () => {
  it('maps xp to levels from the progression table', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(250)).toBe(3);
    expect(getLevelProgress(120).xpIntoLevel).toBe(20);
  });
});

describe('xp engine daily limits', () => {
  it('blocks duplicate create_comment same day', () => {
  const day = new Date().toISOString().slice(0, 10);
    let state = { totalXp: 0, ledger: [] as ReturnType<typeof applyXpAward>['state']['ledger'] };
    const first = applyXpAward(state, 'create_comment', { dedupeKey: `create_comment:${day}`, at: `${day}T10:00:00.000Z` });
    expect(first.result.ok).toBe(true);
    state = first.state;
    const second = applyXpAward(state, 'create_comment', { at: `${day}T18:00:00.000Z` });
    expect(second.result.ok).toBe(false);
    expect(second.result.reason).toBe('daily_limit');
  });
});

describe('streak engine', () => {
  it('increments consecutive days and resets after a gap', () => {
    let s = touchStreak({ currentStreak: 0, bestStreak: 0, lastActiveDate: null }, new Date('2026-07-20T12:00:00Z'));
    expect(s.currentStreak).toBe(1);
    s = touchStreak(s, new Date('2026-07-21T12:00:00Z'));
    expect(s.currentStreak).toBe(2);
    s = touchStreak(s, new Date('2026-07-23T12:00:00Z'));
    expect(s.currentStreak).toBe(1);
    expect(s.bestStreak).toBe(2);
  });
});

describe('progression evaluate (local)', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('awards streak and unlocks profile-related progression', () => {
    const signals = buildProgressionSignals({
      userId: 'u1',
      fullName: 'أحمد',
      city: 'الجزائر',
      avatarUrl: 'https://example.com/a.png',
      bookings: [],
      forumPosts: [],
    });
    const snap = evaluateProgression(signals);
    expect(snap.streakDays).toBeGreaterThanOrEqual(1);
    expect(snap.level).toBeGreaterThanOrEqual(1);
    expect(snap.daily.find(m => m.id === 'daily_photo')?.done).toBe(true);
    expect(snap.xp).toBeGreaterThan(0);
    expect(snap.achievements.length).toBeGreaterThan(0);
  });

  it('tracks referral shares via ProgressionService', () => {
    ProgressionService.recordReferralShare('u2', 'customer');
    ProgressionService.recordReferralShare('u2', 'customer');
    const signals = buildProgressionSignals({
      userId: 'u2',
      fullName: 'سارة',
      city: 'وهران',
      avatarUrl: null,
      bookings: [],
      forumPosts: [],
    });
    const snap = evaluateProgression(signals);
    expect(snap.weekly.find(m => m.id === 'weekly_invite')?.done).toBe(true);
    expect(snap.invitedUsers).toBe(2);
  });
});
