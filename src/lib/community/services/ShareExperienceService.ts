import { COMMUNITY_XP } from '@/lib/community/config';
import { CommunityXpBridge } from '@/lib/community/xpBridge';
import { createShareCard, getUserShareCount } from '@/supabase/community';

export const ShareExperienceService = {
  async share(input: {
    userId: string;
    bookingId?: string;
    barberName: string;
    serviceName?: string;
    rating?: number;
    shareChannel?: string;
  }) {
    const prior = await getUserShareCount(input.userId);
    const isFirst = prior === 0;
    const xpAmount = isFirst ? COMMUNITY_XP.firstShareExperience : COMMUNITY_XP.shareExperience;

    const card = await createShareCard({
      ...input,
      xpAwarded: xpAmount,
    });

    await CommunityXpBridge.awardShareExperience(input.userId, card.id, isFirst);

    return { card, xpAmount, isFirst };
  },

  shareText(card: { barberName: string; serviceName?: string | null; rating?: number | null }) {
    const stars = card.rating ? '⭐'.repeat(card.rating) : '';
    const service = card.serviceName ? ` — ${card.serviceName}` : '';
    return `تجربتي مع ${card.barberName}${service} ${stars}\n#حلاقي`;
  },
};
