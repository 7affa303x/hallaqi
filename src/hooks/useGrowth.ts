import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import {
  buildProgressionSignals,
  evaluateProgression,
  ProgressionService,
  type ProgressionSnapshot,
} from '@/lib/progression';
import { getActiveMissionCatalog, primeMissionCatalog } from '@/lib/progression/missionCatalog';

const EMPTY_SNAPSHOT: ProgressionSnapshot = {
  level: 1,
  xp: 0,
  xpIntoLevel: 0,
  xpToNext: 100,
  streakDays: 0,
  bestStreak: 0,
  badgeCount: 0,
  pinnedBadges: [],
  badges: [],
  achievements: [],
  daily: [],
  weekly: [],
  monthly: [],
  seasonal: [],
  referralCode: 'HALLAQI-GUEST',
  invitedUsers: 0,
  rewardsEarned: 0,
};

/** Live progression snapshot — hydrates from Supabase then evaluates locally. */
export function useGrowth(): {
  snapshot: ProgressionSnapshot;
  ready: boolean;
  refresh: () => void;
  shareReferral: () => void;
  markForumComment: () => void;
  markProductView: (productId: string) => void;
  pinBadges: (badgeIds: string[]) => void;
} {
  const { appUser } = useAuth();
  const { bookings, forumPosts } = useApp();
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    (async () => {
      const catalog = await getActiveMissionCatalog();
      if (!cancelled) primeMissionCatalog(catalog);

      if (appUser?.id) {
        await ProgressionService.hydrateFromRemote(appUser.id);
      }

      if (!cancelled) {
        setReady(true);
        setTick(t => t + 1);
      }
    })();

    return () => {
      cancelled = true;
      if (appUser?.id) ProgressionService.clearHydration(appUser.id);
    };
  }, [appUser?.id]);

  const snapshot = useMemo(() => {
    void tick;
    if (!ready) return EMPTY_SNAPSHOT;

    const signals = buildProgressionSignals({
      userId: appUser?.id,
      fullName: appUser?.full_name || appUser?.username,
      city: appUser?.city,
      avatarUrl: appUser?.avatar_url,
      phone: appUser?.phone_number,
      phoneVerified: Boolean(appUser?.phone_number && appUser.phone_number.replace(/\D/g, '').length >= 9),
      isVerified: appUser?.verification_status === 'verified' || appUser?.verification_status === 'premium',
      galleryPhotoCount: 0,
      bookings,
      forumPosts,
    });
    return evaluateProgression(signals, appUser?.user_role);
  }, [appUser, bookings, forumPosts, tick, ready]);

  const shareReferral = useCallback(() => {
    ProgressionService.recordReferralShare(appUser?.id, 'customer');
    refresh();
  }, [appUser?.id, refresh]);

  const markForumComment = useCallback(() => {
    ProgressionService.recordLocalForumComment(appUser?.id);
    refresh();
  }, [appUser?.id, refresh]);

  const markProductView = useCallback((productId: string) => {
    ProgressionService.recordMarketplaceProductView(appUser?.id, productId);
    refresh();
  }, [appUser?.id, refresh]);

  const pinBadges = useCallback((badgeIds: string[]) => {
    void ProgressionService.setPinnedBadges(appUser?.id, badgeIds).then(() => refresh());
  }, [appUser?.id, refresh]);

  return { snapshot, ready, refresh, shareReferral, markForumComment, markProductView, pinBadges };
}
