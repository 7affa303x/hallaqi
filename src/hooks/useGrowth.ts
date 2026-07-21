import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import {
  buildProgressionSignals,
  evaluateProgression,
  ProgressionService,
  type ProgressionSnapshot,
} from '@/lib/progression';

/** Live progression snapshot (XP / levels / badges / missions / streaks). */
export function useGrowth(): {
  snapshot: ProgressionSnapshot;
  refresh: () => void;
  shareReferral: () => void;
  markForumComment: () => void;
  markProductView: (productId: string) => void;
  pinBadges: (badgeIds: string[]) => void;
} {
  const { appUser } = useAuth();
  const { bookings, forumPosts } = useApp();
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  const snapshot = useMemo(() => {
    void tick;
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
    return evaluateProgression(signals);
  }, [appUser, bookings, forumPosts, tick]);

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

  return { snapshot, refresh, shareReferral, markForumComment, markProductView, pinBadges };
}
