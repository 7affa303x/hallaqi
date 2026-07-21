import { RankingService } from '@/lib/community';
import type { LeaderboardSnapshot } from '@/lib/community/types';
import type { GrowthRankingMetric } from '@/lib/growth-layer/types';
import type { RankingPeriod, RankingScope } from '@/lib/community/config';
import { supabase, isSupabaseConfigured } from '@/supabase/client';
import type { LeaderboardEntry } from '@/lib/community/types';

type LooseQuery = {
  eq: (col: string, val: unknown) => LooseQuery;
  order: (col: string, opts?: { ascending?: boolean }) => LooseQuery;
  limit: (n: number) => LooseQuery;
} & PromiseLike<{ data: unknown; error: { message: string } | null }>;

function db() {
  return supabase as unknown as { from: (t: string) => { select: (c?: string) => LooseQuery } };
}

async function computeReviews(scopeType: RankingScope, scopeValue: string): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await db()
    .from('reviews')
    .select('reviewer_id, profiles!reviews_reviewer_id_fkey(full_name, avatar_url, city, country)')
    .eq('moderation_status', 'approved')
    .limit(500);
  const counts = new Map<string, { name: string; avatar: string | null; city?: string; country?: string; n: number }>();
  for (const row of (data || []) as Record<string, unknown>[]) {
    const uid = String(row.reviewer_id);
    const p = row.profiles as { full_name?: string; avatar_url?: string | null; city?: string; country?: string };
    const cur = counts.get(uid) || { name: p?.full_name || 'مستخدم', avatar: p?.avatar_url ?? null, city: p?.city, country: p?.country, n: 0 };
    cur.n += 1;
    counts.set(uid, cur);
  }
  return [...counts.entries()]
    .filter(([, v]) => matchesScope(scopeType, scopeValue, v))
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 50)
    .map(([userId, v], i) => ({ userId, displayName: v.name, avatarUrl: v.avatar, value: v.n, rank: i + 1 }));
}

async function computeGrowth(scopeType: RankingScope, scopeValue: string): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await db()
    .from('referrals')
    .select('referrer_id, profiles!referrals_referrer_id_fkey(full_name, avatar_url, city, country)')
    .eq('status', 'completed')
    .limit(500);
  const counts = new Map<string, { name: string; avatar: string | null; city?: string; country?: string; n: number }>();
  for (const row of (data || []) as Record<string, unknown>[]) {
    const uid = String(row.referrer_id);
    const p = row.profiles as { full_name?: string; avatar_url?: string | null; city?: string; country?: string };
    const cur = counts.get(uid) || { name: p?.full_name || 'مستخدم', avatar: p?.avatar_url ?? null, city: p?.city, country: p?.country, n: 0 };
    cur.n += 1;
    counts.set(uid, cur);
  }
  return [...counts.entries()]
    .filter(([, v]) => matchesScope(scopeType, scopeValue, v))
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 50)
    .map(([userId, v], i) => ({ userId, displayName: v.name, avatarUrl: v.avatar, value: v.n, rank: i + 1 }));
}

async function computeCommunity(scopeType: RankingScope, scopeValue: string): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await db()
    .from('transformations')
    .select('barber_id, profiles!transformations_barber_id_fkey(full_name, avatar_url, city, country)')
    .eq('status', 'published')
    .limit(500);
  const counts = new Map<string, { name: string; avatar: string | null; city?: string; country?: string; n: number }>();
  for (const row of (data || []) as Record<string, unknown>[]) {
    const uid = String(row.barber_id);
    const p = row.profiles as { full_name?: string; avatar_url?: string | null; city?: string; country?: string };
    const cur = counts.get(uid) || { name: p?.full_name || 'حلاق', avatar: p?.avatar_url ?? null, city: p?.city, country: p?.country, n: 0 };
    cur.n += 1;
    counts.set(uid, cur);
  }
  return [...counts.entries()]
    .filter(([, v]) => matchesScope(scopeType, scopeValue, v))
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 50)
    .map(([userId, v], i) => ({ userId, displayName: v.name, avatarUrl: v.avatar, value: v.n, rank: i + 1 }));
}

function matchesScope(scopeType: RankingScope, scopeValue: string, profile: { city?: string; country?: string }): boolean {
  if (!scopeValue) return true;
  const v = scopeValue.toLowerCase();
  if (scopeType === 'country') return (profile.country || '').toLowerCase().includes(v);
  return (profile.city || '').toLowerCase().includes(v);
}

/** Extends community RankingService with growth-specific metrics. */
export const GrowthLeaderboardService = {
  defaultScopes: RankingService.defaultScopesForProfile,

  async get(
    scopeType: RankingScope,
    scopeValue: string,
    metric: GrowthRankingMetric,
    period: RankingPeriod,
    userId?: string,
  ): Promise<LeaderboardSnapshot> {
    if (metric === 'reviews') {
      const entries = await computeReviews(scopeType, scopeValue);
      return {
        scopeType, scopeValue, metric: 'xp', period, entries,
        computedAt: new Date().toISOString(),
        userRank: userId ? entries.find(e => e.userId === userId)?.rank : undefined,
      };
    }
    if (metric === 'growth') {
      const entries = await computeGrowth(scopeType, scopeValue);
      return {
        scopeType, scopeValue, metric: 'xp', period, entries,
        computedAt: new Date().toISOString(),
        userRank: userId ? entries.find(e => e.userId === userId)?.rank : undefined,
      };
    }
    if (metric === 'community') {
      const entries = await computeCommunity(scopeType, scopeValue);
      return {
        scopeType, scopeValue, metric: 'xp', period, entries,
        computedAt: new Date().toISOString(),
        userRank: userId ? entries.find(e => e.userId === userId)?.rank : undefined,
      };
    }
    const communityMetric = metric as 'xp' | 'bookings' | 'rating' | 'followers' | 'completed_jobs';
    return RankingService.getLeaderboard(scopeType, scopeValue, communityMetric, period, userId);
  },
};
