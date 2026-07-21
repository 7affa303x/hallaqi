import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  RankingService,
  TagService,
  TransformationService,
  type CommunityStats,
  type CommunityTag,
  type LeaderboardSnapshot,
  type Transformation,
} from '@/lib/community';
import { getCommunityStats } from '@/supabase/community';
import { isSupabaseConfigured } from '@/supabase/client';

export function useCommunity() {
  const { appUser } = useAuth();
  const userId = appUser?.id;
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [pendingTags, setPendingTags] = useState<CommunityTag[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [localRank, setLocalRank] = useState<LeaderboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const [t, tags, s] = await Promise.all([
        TransformationService.forUser(userId),
        TagService.pendingForUser(userId),
        getCommunityStats(userId),
      ]);
      setTransformations(t);
      setPendingTags(tags);
      setStats(s);

      const scopes = RankingService.defaultScopesForProfile(appUser?.city, appUser?.country);
      const primary = scopes[0];
      if (primary) {
        const board = await RankingService.getLeaderboard(primary.type, primary.value, 'xp', 'monthly', userId);
        setLocalRank(board);
      }
    } catch {
      /* offline / migration pending */
    } finally {
      setLoading(false);
    }
  }, [userId, appUser?.city, appUser?.country]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pinned = userId ? TransformationService.pinnedForUser(transformations, userId) : [];

  return {
    transformations,
    pinnedTransformations: pinned,
    pendingTags,
    stats,
    localRank,
    loading,
    refresh,
  };
}
