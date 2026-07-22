import type { RankingMetric, RankingPeriod, RankingScope } from '@/lib/community/config';
import type { LeaderboardEntry, LeaderboardSnapshot } from '@/lib/community/types';
import { getLeaderboardFromCache, notifyRankingChange, upsertLeaderboardCache } from '@/supabase/community';
import { supabase, isSupabaseConfigured } from '@/supabase/client';

const CACHE_TTL_MS = 30 * 60 * 1000;

type LooseQuery = {
  eq: (col: string, val: unknown) => LooseQuery;
  order: (col: string, opts?: { ascending?: boolean }) => LooseQuery;
  limit: (n: number) => LooseQuery;
} & PromiseLike<{ data: unknown; error: { message: string } | null }>;

type LooseClient = {
  from: (table: string) => {
    select: (cols?: string) => LooseQuery;
  };
};

function db(): LooseClient {
  return supabase as unknown as LooseClient;
}

function isFresh(computedAt: string): boolean {
  return Date.now() - Date.parse(computedAt) < CACHE_TTL_MS;
}

async function computeEntries(
  scopeType: RankingScope,
  scopeValue: string,
  metric: RankingMetric,
): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured()) return [];

  if (metric === 'xp') {
    const { data } = await db()
      .from('user_progress')
      .select('user_id, total_xp, profiles(full_name, avatar_url, city, country)')
      .order('total_xp', { ascending: false })
      .limit(50);
    return filterByScope((data || []) as Record<string, unknown>[], scopeType, scopeValue)
      .map((row, i) => ({
        userId: String(row.user_id),
        displayName: String((row.profiles as { full_name?: string })?.full_name || 'مستخدم'),
        avatarUrl: (row.profiles as { avatar_url?: string })?.avatar_url ?? null,
        value: Number(row.total_xp || 0),
        rank: i + 1,
      }));
  }

  if (metric === 'rating' || metric === 'followers' || metric === 'completed_jobs') {
    const orderCol = metric === 'rating' ? 'average_rating' : 'followers_count';
    const { data } = await db()
      .from('professionals')
      .select('id, average_rating, followers_count, profiles(full_name, avatar_url, city, country)')
      .order(orderCol, { ascending: false })
      .limit(100);
    const filtered = filterByScope((data || []) as Record<string, unknown>[], scopeType, scopeValue);
    return filtered.map((row, i) => ({
      userId: String(row.id),
      displayName: String((row.profiles as { full_name?: string })?.full_name || 'حلاق'),
      avatarUrl: (row.profiles as { avatar_url?: string })?.avatar_url ?? null,
      value: metric === 'rating'
        ? Number(row.average_rating || 0)
        : Number(row.followers_count || 0),
      rank: i + 1,
    })).slice(0, 50);
  }

  const { data } = await db()
    .from('bookings')
    .select('client_id, profiles!bookings_client_id_fkey(full_name, avatar_url, city, country)')
    .eq('status', 'completed')
    .limit(500);
  const counts = new Map<string, { name: string; avatar: string | null; city?: string; country?: string; n: number }>();
  for (const row of (data || []) as Record<string, unknown>[]) {
    const uid = String(row.client_id);
    const p = row.profiles as { full_name?: string; avatar_url?: string | null; city?: string; country?: string };
    const cur = counts.get(uid) || { name: p?.full_name || 'مستخدم', avatar: p?.avatar_url ?? null, city: p?.city, country: p?.country, n: 0 };
    cur.n += 1;
    counts.set(uid, cur);
  }
  return [...counts.entries()]
    .filter(([, v]) => matchesScope(scopeType, scopeValue, v))
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 50)
    .map(([userId, v], i) => ({
      userId,
      displayName: v.name,
      avatarUrl: v.avatar,
      value: v.n,
      rank: i + 1,
    }));
}

function matchesScope(scopeType: RankingScope, scopeValue: string, profile: { city?: string; country?: string }): boolean {
  if (!scopeValue) return true;
  const v = scopeValue.toLowerCase();
  if (scopeType === 'country') return (profile.country || '').toLowerCase().includes(v);
  if (scopeType === 'city' || scopeType === 'state' || scopeType === 'district') {
    return (profile.city || '').toLowerCase().includes(v);
  }
  return true;
}

function filterByScope(rows: Record<string, unknown>[], scopeType: RankingScope, scopeValue: string) {
  return rows.filter((row) => {
    const p = row.profiles as { city?: string; country?: string } | undefined;
    return matchesScope(scopeType, scopeValue, p || {});
  }).slice(0, 50);
}

export const RankingService = {
  async getLeaderboard(
    scopeType: RankingScope,
    scopeValue: string,
    metric: RankingMetric,
    period: RankingPeriod,
    userId?: string,
  ): Promise<LeaderboardSnapshot> {
    const cached = await getLeaderboardFromCache(scopeType, scopeValue, metric, period);
    const previousUserRank = userId ? cached?.entries.find(e => e.userId === userId)?.rank : undefined;

    if (cached && isFresh(cached.computedAt)) {
      const userRank = userId ? cached.entries.find(e => e.userId === userId)?.rank : undefined;
      return { ...cached, userRank };
    }

    const entries = await computeEntries(scopeType, scopeValue, metric);
    const snapshot: LeaderboardSnapshot = {
      scopeType,
      scopeValue,
      metric,
      period,
      entries,
      computedAt: new Date().toISOString(),
      userRank: userId ? entries.find(e => e.userId === userId)?.rank : undefined,
    };

    try {
      await upsertLeaderboardCache(snapshot);
    } catch {
      /* cache optional */
    }

    if (userId && snapshot.userRank && previousUserRank) {
      void notifyRankingChange(userId, scopeValue, metric, snapshot.userRank, previousUserRank);
    }

    return snapshot;
  },

  /** Local-first scopes: neighborhood → municipal → wilaya → national. */
  defaultScopesForProfile(city?: string | null, country?: string | null, wilaya?: string | null) {
    const scopes: { type: RankingScope; value: string }[] = [];
    if (city) scopes.push({ type: 'district', value: city });
    if (city) scopes.push({ type: 'city', value: city });
    if (wilaya && wilaya !== city) scopes.push({ type: 'state', value: wilaya });
    if (country) scopes.push({ type: 'country', value: country });
    if (scopes.length === 0) scopes.push({ type: 'country', value: 'Algeria' });
    return scopes;
  },
};
