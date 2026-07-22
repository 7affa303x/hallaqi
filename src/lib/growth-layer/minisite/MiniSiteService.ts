import type { MiniSite } from '@/lib/growth-layer/types';
import { AntiAbuseService } from '@/lib/growth-layer/validation/AntiAbuseService';
import { getMiniSiteBySlug, getMiniSiteForUser, upsertMiniSite } from '@/supabase/growth';

export const MiniSiteService = {
  async bySlug(slug: string): Promise<MiniSite | null> {
    return getMiniSiteBySlug(slug);
  },

  async forUser(userId: string): Promise<MiniSite | null> {
    return getMiniSiteForUser(userId);
  },

  async save(input: {
    userId: string;
    slug: string;
    theme?: string;
    seoTitle?: string;
    seoDescription?: string;
    isPublished?: boolean;
  }) {
    const check = AntiAbuseService.validateMiniSiteSlug(input.slug);
    if (!check.ok) throw new Error(check.reason);
    return upsertMiniSite(input);
  },

  publicUrl(slug: string) {
    return `https://hallaqi.app/u/${slug}`;
  },
};
