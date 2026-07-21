import { trackProductEvent } from '@/lib/product-analytics';
import { recordGrowthAnalytics } from '@/supabase/growth';
import type { GrowthAnalyticsEvent } from '@/lib/growth-layer/types';

export const GrowthAnalyticsService = {
  async track(event: GrowthAnalyticsEvent, metadata?: Record<string, unknown>) {
    try {
      await recordGrowthAnalytics(event, metadata);
    } catch {
      /* non-blocking */
    }
    const map: Partial<Record<GrowthAnalyticsEvent, string>> = {
      invite_sent: 'Invite Sent',
      invite_accepted: 'Invite Accepted',
      referral_completed: 'Referral Completed',
    };
    const productEvent = map[event];
    if (productEvent) {
      trackProductEvent(productEvent as never, metadata as never);
    }
  },
};
