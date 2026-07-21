import { createReview } from '@/supabase/database';
import { CommunityXpBridge } from '@/lib/community/xpBridge';
import { addReviewImage } from '@/supabase/community';

/** Wraps existing createReview + community XP/images without changing booking core. */
export const ReviewCommunityService = {
  async submitReview(input: {
    booking_id: string;
    reviewer_id: string;
    professional_id: string;
    rating: number;
    comment?: string | null;
    imageUrls?: string[];
  }) {
    const review = await createReview({
      booking_id: input.booking_id,
      reviewer_id: input.reviewer_id,
      professional_id: input.professional_id,
      rating: input.rating,
      comment: input.comment?.trim() || null,
    });

    const hasText = Boolean(input.comment?.trim());
    void CommunityXpBridge.awardReview(input.reviewer_id, review.id, hasText);

    if (input.imageUrls?.length) {
      await Promise.all(
        input.imageUrls.map((url, i) => addReviewImage(review.id, url, i)),
      );
    }

    return review;
  },
};
