import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { buildGrowthSignals, evaluateGrowth, type GrowthSnapshot } from '@/lib/growth/engine';
import {
  recordLocalForumComment,
  recordMarketplaceProductView,
  recordReferralShare,
} from '@/lib/growth/storage';

/** Live growth snapshot derived from app data + device storage. */
export function useGrowth(): {
  snapshot: GrowthSnapshot;
  refresh: () => void;
  shareReferral: () => void;
  markForumComment: () => void;
  markProductView: (productId: string) => void;
} {
  const { appUser } = useAuth();
  const { bookings, forumPosts } = useApp();
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  const snapshot = useMemo(() => {
    void tick;
    const signals = buildGrowthSignals({
      userId: appUser?.id,
      fullName: appUser?.full_name || appUser?.username,
      city: appUser?.city,
      avatarUrl: appUser?.avatar_url,
      bookings,
      forumPosts,
    });
    return evaluateGrowth(signals);
  }, [appUser, bookings, forumPosts, tick]);

  const shareReferral = useCallback(() => {
    recordReferralShare(appUser?.id);
    refresh();
  }, [appUser?.id, refresh]);

  const markForumComment = useCallback(() => {
    recordLocalForumComment(appUser?.id);
    refresh();
  }, [appUser?.id, refresh]);

  const markProductView = useCallback((productId: string) => {
    recordMarketplaceProductView(appUser?.id, productId);
    refresh();
  }, [appUser?.id, refresh]);

  return { snapshot, refresh, shareReferral, markForumComment, markProductView };
}
