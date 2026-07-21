/**
 * Awards community XP via existing ProgressionService — does not modify XP engine.
 */
import { ProgressionService } from '@/lib/progression';
import { COMMUNITY_XP } from '@/lib/community/config';

export const CommunityXpBridge = {
  awardTransformationPublished(userId: string, transformationId: string) {
    return ProgressionService.awardXP(
      userId,
      'mission_reward',
      COMMUNITY_XP.transformationPublishedEach,
      {
        dedupeKey: `community:transformation:${transformationId}:${userId}`,
        metadata: { transformationId },
      },
    );
  },

  awardTagAccepted(userId: string, tagId: string) {
    return ProgressionService.awardXP(userId, 'mission_reward', COMMUNITY_XP.tagAccepted, {
      dedupeKey: `community:tag:${tagId}:${userId}`,
      metadata: { tagId },
    });
  },

  awardShareExperience(userId: string, shareCardId: string, isFirst: boolean) {
    const amount = isFirst ? COMMUNITY_XP.firstShareExperience : COMMUNITY_XP.shareExperience;
    return ProgressionService.awardXP(userId, 'mission_reward', amount, {
      dedupeKey: isFirst ? `community:share:first:${userId}` : `community:share:${shareCardId}`,
      metadata: { shareCardId, isFirst },
    });
  },

  awardReview(userId: string, reviewId: string, hasText: boolean) {
    const eventType = hasText ? 'review_with_text' : 'star_rating_only';
    return ProgressionService.awardXP(userId, eventType, undefined, {
      dedupeKey: `review:${reviewId}`,
      metadata: { reviewId },
    });
  },
};
