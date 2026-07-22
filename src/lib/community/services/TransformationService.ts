import { COMMUNITY_XP } from '@/lib/community/config';
import type { CreateTransformationInput, Transformation } from '@/lib/community/types';
import { CommunityXpBridge } from '@/lib/community/xpBridge';
import {
  createTransformation,
  getPublishedTransformations,
  getUserTransformations,
  respondTransformation,
  setTransformationPin,
} from '@/supabase/community';

export const TransformationService = {
  create: (input: CreateTransformationInput) => createTransformation(input),

  async respond(transformationId: string, userId: string, accept: boolean, transformation?: Transformation) {
    if (transformation && transformation.customerId !== userId) {
      throw new Error('غير مصرح');
    }
    const result = await respondTransformation(transformationId, accept);
    if (result.ok && accept && transformation) {
      await CommunityXpBridge.awardTransformationPublished(transformation.barberId, transformationId);
      await CommunityXpBridge.awardTransformationPublished(transformation.customerId, transformationId);
    }
    return result;
  },

  forUser: (userId: string) => getUserTransformations(userId),

  published: (limit?: number) => getPublishedTransformations(limit),

  pin: (id: string, userId: string, role: 'barber' | 'customer', pinned: boolean) =>
    setTransformationPin(id, userId, role, pinned),

  pinnedForUser(transformations: Transformation[], userId: string) {
    return transformations
      .filter(t => t.status === 'published' && (
        (t.barberId === userId && t.pinnedByBarber) ||
        (t.customerId === userId && t.pinnedByCustomer)
      ))
      .slice(0, 3);
  },
};

export { COMMUNITY_XP };
