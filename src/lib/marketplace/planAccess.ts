import type { MarketplacePlanTier, MarketplaceSubscriptionPlan } from '@/types/marketplace';
import { marketplacePlans } from '@/data/marketplaceSeed';

const ANALYTICS_RANK: Record<MarketplaceSubscriptionPlan['analyticsLevel'], number> = {
  basic: 0,
  standard: 1,
  advanced: 2,
  full: 3,
};

export function planTierRank(plan?: MarketplacePlanTier | 'pro' | 'premium' | string | null): number {
  switch (plan) {
    case 'business':
    case 'premium':
      return 4;
    case 'professional':
    case 'pro':
      return 3;
    case 'basic':
      return 2;
    case 'free':
    default:
      return 1;
  }
}

export function getPlanById(planId?: MarketplacePlanTier | string | null): MarketplaceSubscriptionPlan {
  return marketplacePlans.find(p => p.id === planId) || marketplacePlans[0];
}

/** Advanced analytics require professional+; full metrics require business. */
export function canAccessAnalyticsLevel(
  planId: MarketplacePlanTier | string | undefined,
  required: MarketplaceSubscriptionPlan['analyticsLevel']
): boolean {
  const plan = getPlanById(planId);
  return ANALYTICS_RANK[plan.analyticsLevel] >= ANALYTICS_RANK[required];
}

/** AI listing tools unlock at basic+ (insights/tools, not just quantity). */
export function canAccessAiListingTools(planId?: MarketplacePlanTier | string | null): boolean {
  return planTierRank(planId) >= 2;
}

export function analyticsUnlockMessage(planId?: MarketplacePlanTier | string | null): string {
  const plan = getPlanById(planId);
  if (plan.analyticsLevel === 'full') return 'تحليلات كاملة مفعّلة';
  if (plan.analyticsLevel === 'advanced') return 'تحليلات متقدمة — رقِّ إلى أعمال للتحويل الكامل';
  if (plan.analyticsLevel === 'standard') return 'تحليلات أساسية — رقِّ للاحترافي للمزيد';
  return 'الخطة المجانية تعرض ملخصاً محدوداً — رقِّ لفتح الرؤى';
}
