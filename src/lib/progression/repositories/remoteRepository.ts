/**
 * Supabase progression repository.
 * Falls back silently when tables/RPCs are not yet migrated.
 */

import { supabase, isSupabaseConfigured } from '@/supabase/client';
import type { XpEventType } from '@/lib/progression/config/xpEvents';
import type {
  MissionDef,
  ProgressState,
  StreakState,
  UserAchievementState,
  UserBadgeState,
  UserMissionState,
} from '@/lib/progression/models/types';

type UpdateBuilder = {
  eq: (col: string, val: unknown) => UpdateBuilder & PromiseLike<{ error: { message: string } | null }>;
};

type LooseQuery = {
  eq: (col: string, val: unknown) => LooseQuery;
  order: (col: string, opts?: object) => LooseQuery;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
} & PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;

type LooseClient = {
  from: (table: string) => {
    select: (cols?: string) => LooseQuery;
    update: (vals: Record<string, unknown>) => UpdateBuilder;
    upsert: (vals: Record<string, unknown> | Record<string, unknown>[], opts?: object) => LooseQuery;
    insert: (vals: Record<string, unknown> | Record<string, unknown>[]) => LooseQuery;
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function db(): LooseClient {
  return supabase as unknown as LooseClient;
}

function isMissingRelation(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return err.code === '42P01' || err.code === 'PGRST205' || msg.includes('does not exist') || msg.includes('schema cache');
}

export async function remoteAwardXp(
  eventType: XpEventType,
  amount?: number,
  dedupeKey?: string | null,
  metadata?: Record<string, unknown>,
): Promise<{ ok: boolean; amount?: number; total_xp?: number; level?: number; reason?: string } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await db().rpc('award_progression_xp', {
      p_event_type: eventType,
      p_amount: amount ?? null,
      p_dedupe_key: dedupeKey ?? null,
      p_metadata: metadata ?? {},
    });
    if (error) {
      if (isMissingRelation(error)) return null;
      return { ok: false, reason: error.message };
    }
    return (data as { ok: boolean; amount?: number; total_xp?: number; level?: number; reason?: string }) || null;
  } catch {
    return null;
  }
}

export async function remoteTouchStreak(): Promise<StreakState | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await db().rpc('touch_progression_streak');
    if (error || !data) return null;
    const row = data as { current_streak?: number; best_streak?: number; last_active_date?: string };
    return {
      currentStreak: row.current_streak ?? 0,
      bestStreak: row.best_streak ?? 0,
      lastActiveDate: row.last_active_date ?? null,
    };
  } catch {
    return null;
  }
}

export async function fetchUserProgress(userId: string): Promise<ProgressState | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await db()
      .from('user_progress')
      .select('user_id, total_xp, level')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) {
      if (isMissingRelation(error)) return null;
      return null;
    }
    const row = data as { user_id: string; total_xp: number; level: number };
    return { userId: row.user_id, totalXp: row.total_xp, level: row.level };
  } catch {
    return null;
  }
}

export async function fetchUserStreak(userId: string): Promise<StreakState | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await db()
      .from('user_streaks')
      .select('current_streak, best_streak, last_active_date')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as { current_streak: number; best_streak: number; last_active_date: string | null };
    return {
      currentStreak: row.current_streak,
      bestStreak: row.best_streak,
      lastActiveDate: row.last_active_date,
    };
  } catch {
    return null;
  }
}

export async function fetchUserBadges(userId: string): Promise<UserBadgeState[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await db()
      .from('user_badges')
      .select('badge_id, earned_at, is_pinned, pin_order')
      .eq('user_id', userId);
    if (error) return isMissingRelation(error) ? null : [];
    return ((data as Array<{ badge_id: string; earned_at: string; is_pinned: boolean; pin_order: number | null }>) || [])
      .map(r => ({
        badgeId: r.badge_id,
        earnedAt: r.earned_at,
        isPinned: r.is_pinned,
        pinOrder: r.pin_order,
      }));
  } catch {
    return null;
  }
}

export async function fetchUserAchievements(userId: string): Promise<UserAchievementState[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await db()
      .from('user_achievements')
      .select('achievement_id, progress, earned_at')
      .eq('user_id', userId);
    if (error) return isMissingRelation(error) ? null : [];
    return ((data as Array<{ achievement_id: string; progress: number; earned_at: string | null }>) || [])
      .map(r => ({
        achievementId: r.achievement_id,
        progress: r.progress,
        earnedAt: r.earned_at,
      }));
  } catch {
    return null;
  }
}

export async function fetchUserMissions(userId: string): Promise<UserMissionState[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await db()
      .from('user_missions')
      .select('mission_id, period_key, progress, target, completed, claimed_at')
      .eq('user_id', userId);
    if (error) return isMissingRelation(error) ? null : [];
    return ((data as Array<{
      mission_id: string;
      period_key: string;
      progress: number;
      target: number;
      completed: boolean;
      claimed_at: string | null;
    }>) || []).map(r => ({
      missionId: r.mission_id,
      periodKey: r.period_key,
      progress: r.progress,
      target: r.target,
      completed: r.completed,
      claimedAt: r.claimed_at,
    }));
  } catch {
    return null;
  }
}

export async function fetchMissionCatalog(): Promise<MissionDef[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await db()
      .from('progression_missions')
      .select('id, title_ar, description_ar, mission_type, target, xp_reward, signal_key, season_key')
      .eq('is_active', true)
      .order('sort_order');
    if (error) return null;
    return ((data as Array<{
      id: string;
      title_ar: string;
      description_ar: string;
      mission_type: MissionDef['type'];
      target: number;
      xp_reward: number;
      signal_key: string;
      season_key: string | null;
    }>) || []).map(r => ({
      id: r.id,
      titleAr: r.title_ar,
      descriptionAr: r.description_ar,
      type: r.mission_type,
      target: r.target,
      xpReward: r.xp_reward,
      signalKey: r.signal_key,
      seasonKey: r.season_key,
    }));
  } catch {
    return null;
  }
}

export async function upsertUserBadge(userId: string, badge: UserBadgeState): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await db().from('user_badges').upsert({
      user_id: userId,
      badge_id: badge.badgeId,
      earned_at: badge.earnedAt,
      is_pinned: badge.isPinned,
      pin_order: badge.pinOrder,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function upsertUserAchievement(userId: string, row: UserAchievementState): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await db().from('user_achievements').upsert({
      user_id: userId,
      achievement_id: row.achievementId,
      progress: row.progress,
      earned_at: row.earnedAt,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function upsertUserMission(userId: string, row: UserMissionState): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await db().from('user_missions').upsert({
      user_id: userId,
      mission_id: row.missionId,
      period_key: row.periodKey,
      progress: row.progress,
      target: row.target,
      completed: row.completed,
      claimed_at: row.claimedAt,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function updateBadgePins(
  userId: string,
  pins: { badgeId: string; isPinned: boolean; pinOrder: number | null }[],
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    for (const p of pins) {
      const { error } = await db()
        .from('user_badges')
        .update({ is_pinned: p.isPinned, pin_order: p.pinOrder })
        .eq('user_id', userId)
        .eq('badge_id', p.badgeId);
      if (error) return false;
    }
    return true;
  } catch {
    return false;
  }
}
