import type { StreakState } from '@/lib/progression/models/types';

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const pa = new Date(`${a}T12:00:00Z`).getTime();
  const pb = new Date(`${b}T12:00:00Z`).getTime();
  return Math.round((pb - pa) / 86400000);
}

export function emptyStreak(): StreakState {
  return { currentStreak: 0, bestStreak: 0, lastActiveDate: null };
}

/** Advance streak for opening/using the app today. */
export function touchStreak(state: StreakState, now = new Date()): StreakState {
  const today = todayKey(now);
  if (state.lastActiveDate === today) return state;

  let current = 1;
  if (state.lastActiveDate) {
    const diff = diffDays(state.lastActiveDate, today);
    current = diff === 1 ? state.currentStreak + 1 : 1;
  }

  return {
    currentStreak: current,
    bestStreak: Math.max(state.bestStreak, current),
    lastActiveDate: today,
  };
}

export const STREAK_BADGE_DAYS = [7, 30, 100, 365] as const;
