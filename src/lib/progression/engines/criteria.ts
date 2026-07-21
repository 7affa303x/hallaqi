import type { CriteriaMap, ProgressionSignals, StreakState } from '@/lib/progression/models/types';

export function criteriaMet(criteria: CriteriaMap, signals: ProgressionSignals, streak: StreakState): boolean {
  if (criteria.completedBookings != null && signals.completedBookings < criteria.completedBookings) return false;
  if (criteria.reviews != null && signals.reviewedBookings < criteria.reviews) return false;
  if (criteria.forumPosts != null && signals.forumPostCount < criteria.forumPosts) return false;
  if (criteria.forumComments != null && signals.forumCommentCount < criteria.forumComments) return false;
  if (criteria.referralShares != null && signals.referralShares < criteria.referralShares) return false;
  if (criteria.streakDays != null && streak.currentStreak < criteria.streakDays) return false;
  if (criteria.trusted === true && !signals.isTrusted) return false;
  if (criteria.verified === true && !signals.isVerified) return false;
  if (criteria.earlySupporter === true && !signals.isEarlySupporter) return false;
  if (criteria.galleryCompleted === true && !signals.galleryCompleted) return false;
  if (criteria.hasAvatar === true && !signals.hasAvatar) return false;
  if (criteria.phoneVerified === true && !signals.phoneVerified) return false;
  return true;
}

export function criteriaTarget(criteria: CriteriaMap): number {
  return (
    criteria.completedBookings
    ?? criteria.reviews
    ?? criteria.forumPosts
    ?? criteria.forumComments
    ?? criteria.referralShares
    ?? criteria.streakDays
    ?? 1
  );
}

export function criteriaProgress(criteria: CriteriaMap, signals: ProgressionSignals, streak: StreakState): number {
  if (criteria.completedBookings != null) return Math.min(criteria.completedBookings, signals.completedBookings);
  if (criteria.reviews != null) return Math.min(criteria.reviews, signals.reviewedBookings);
  if (criteria.forumPosts != null) return Math.min(criteria.forumPosts, signals.forumPostCount);
  if (criteria.forumComments != null) return Math.min(criteria.forumComments, signals.forumCommentCount);
  if (criteria.referralShares != null) return Math.min(criteria.referralShares, signals.referralShares);
  if (criteria.streakDays != null) return Math.min(criteria.streakDays, streak.currentStreak);
  if (criteria.trusted === true) return signals.isTrusted ? 1 : 0;
  if (criteria.verified === true) return signals.isVerified ? 1 : 0;
  if (criteria.earlySupporter === true) return signals.isEarlySupporter ? 1 : 0;
  if (criteria.galleryCompleted === true) return signals.galleryCompleted ? 1 : 0;
  return 0;
}
