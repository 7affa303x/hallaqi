import { getLevelProgress, levelFromXp } from '@/lib/progression/config/levels';
import {
  DAILY_LIMITED_XP_EVENTS,
  type XpEventType,
  xpAmountFor,
} from '@/lib/progression/config/xpEvents';
import type { AwardXpResult } from '@/lib/progression/models/types';

export interface XpLedgerEntry {
  eventType: XpEventType;
  amount: number;
  dedupeKey: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface XpEngineState {
  totalXp: number;
  ledger: XpLedgerEntry[];
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function canAwardXp(
  state: XpEngineState,
  eventType: XpEventType,
  dedupeKey?: string | null,
): { ok: true } | { ok: false; reason: string } {
  if (dedupeKey && state.ledger.some(e => e.dedupeKey === dedupeKey)) {
    return { ok: false, reason: 'duplicate' };
  }
  if (DAILY_LIMITED_XP_EVENTS.has(eventType)) {
    const today = todayKey();
    const hit = state.ledger.some(
      e => e.eventType === eventType && dayKey(e.createdAt) === today,
    );
    if (hit) return { ok: false, reason: 'daily_limit' };
  }
  const amount = xpAmountFor(eventType);
  if (amount <= 0 && eventType !== 'mission_reward' && eventType !== 'badge_bonus' && eventType !== 'achievement_reward') {
    return { ok: false, reason: 'invalid_amount' };
  }
  return { ok: true };
}

export function applyXpAward(
  state: XpEngineState,
  eventType: XpEventType,
  options?: { amount?: number; dedupeKey?: string | null; metadata?: Record<string, unknown>; at?: string },
): { state: XpEngineState; result: AwardXpResult } {
  const amount = xpAmountFor(eventType, options?.amount);
  const gate = canAwardXp(state, eventType, options?.dedupeKey);
  if (!gate.ok) {
    return {
      state,
      result: {
        ok: false,
        amount: 0,
        totalXp: state.totalXp,
        level: levelFromXp(state.totalXp),
        reason: gate.reason,
        eventType,
      },
    };
  }
  if (amount <= 0) {
    return {
      state,
      result: {
        ok: false,
        amount: 0,
        totalXp: state.totalXp,
        level: levelFromXp(state.totalXp),
        reason: 'invalid_amount',
        eventType,
      },
    };
  }

  const entry: XpLedgerEntry = {
    eventType,
    amount,
    dedupeKey: options?.dedupeKey ?? null,
    createdAt: options?.at ?? new Date().toISOString(),
    metadata: options?.metadata,
  };
  const totalXp = state.totalXp + amount;
  const next: XpEngineState = {
    totalXp,
    ledger: [...state.ledger, entry],
  };
  return {
    state: next,
    result: {
      ok: true,
      amount,
      totalXp,
      level: levelFromXp(totalXp),
      eventType,
    },
  };
}

export { getLevelProgress, levelFromXp };
