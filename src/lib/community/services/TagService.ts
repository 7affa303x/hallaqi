import { COMMUNITY_XP } from '@/lib/community/config';
import { CommunityXpBridge } from '@/lib/community/xpBridge';
import {
  createCommunityTag,
  getPendingTagsForUser,
  respondCommunityTag,
} from '@/supabase/community';

export const TagService = {
  create: createCommunityTag,
  pendingForUser: getPendingTagsForUser,

  async respond(tagId: string, accept: boolean, taggerId?: string) {
    const result = await respondCommunityTag(tagId, accept);
    if (result.ok && accept && taggerId) {
      await CommunityXpBridge.awardTagAccepted(taggerId, tagId);
    }
    return result;
  },
};

export { COMMUNITY_XP };
