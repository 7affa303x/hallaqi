import type { MarketplaceAnalyticsEventType, MarketplaceAnalyticsSummary } from '@/types/marketplace';
import { mockMarketplaceAnalytics } from '@/data/marketplaceSeed';
import { trackMarketplaceEventRemote } from '@/supabase/marketplace';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

const LOCAL_KEY = 'hallaqi-marketplace-analytics';

interface LocalEvent {
  eventType: MarketplaceAnalyticsEventType;
  sellerId?: string;
  productId?: string;
  wilaya?: string;
  categoryId?: string;
  at: string;
}

function readEvents(): LocalEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) as LocalEvent[] : [];
  } catch {
    return [];
  }
}

function writeEvents(events: LocalEvent[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(events.slice(-2000)));
  } catch {
    // ignore quota
  }
}

let lastTrackAt = 0;

/** Fire-and-forget marketplace analytics (local + remote when available). */
export function trackMarketplaceEvent(
  eventType: MarketplaceAnalyticsEventType,
  payload: { sellerId?: string; productId?: string; wilaya?: string; categoryId?: string } = {}
) {
  const now = Date.now();
  if (now - lastTrackAt < 120) return;
  lastTrackAt = now;

  const events = readEvents();
  events.push({ eventType, ...payload, at: new Date().toISOString() });
  writeEvents(events);
  void trackMarketplaceEventRemote(eventType, payload);
}

function emptySummary(): MarketplaceAnalyticsSummary {
  return {
    views: 0,
    clicks: 0,
    saves: 0,
    profileVisits: 0,
    searchImpressions: 0,
    featuredImpressions: 0,
    featuredClicks: 0,
    visitStoreClicks: 0,
    productOfDayViews: 0,
    productOfDayClicks: 0,
    conversionRatePct: 0,
    topCategories: [],
    topLocations: [],
    growthPct: 0,
  };
}

export function summarizeMarketplaceAnalytics(sellerId?: string): MarketplaceAnalyticsSummary {
  const events = readEvents().filter(e => !sellerId || e.sellerId === sellerId);

  if (events.length < 5 && FEATURE_FLAGS.marketplaceMockAnalytics) {
    const base = sellerId
      ? {
          ...mockMarketplaceAnalytics,
          views: Math.round(mockMarketplaceAnalytics.views * 0.35),
          clicks: Math.round(mockMarketplaceAnalytics.clicks * 0.35),
          visitStoreClicks: Math.round(mockMarketplaceAnalytics.visitStoreClicks * 0.35),
        }
      : mockMarketplaceAnalytics;
    return {
      ...base,
      conversionRatePct: base.views > 0
        ? Math.round((base.visitStoreClicks / base.views) * 1000) / 10
        : 0,
    };
  }

  if (events.length === 0) return emptySummary();

  const count = (type: MarketplaceAnalyticsEventType) => events.filter(e => e.eventType === type).length;
  const categoryMap = new Map<string, number>();
  const locationMap = new Map<string, number>();
  for (const e of events) {
    if (e.categoryId) categoryMap.set(e.categoryId, (categoryMap.get(e.categoryId) || 0) + 1);
    if (e.wilaya) locationMap.set(e.wilaya, (locationMap.get(e.wilaya) || 0) + 1);
  }

  const views = count('view');
  const visitStoreClicks = count('visit_store');

  return {
    views,
    clicks: count('click'),
    saves: count('save'),
    profileVisits: count('profile_visit'),
    searchImpressions: count('search_impression'),
    featuredImpressions: count('featured_impression'),
    featuredClicks: count('featured_click'),
    visitStoreClicks,
    productOfDayViews: count('product_of_day_view'),
    productOfDayClicks: count('product_of_day_click'),
    conversionRatePct: views > 0 ? Math.round((visitStoreClicks / views) * 1000) / 10 : 0,
    topCategories: [...categoryMap.entries()]
      .map(([id, c]) => ({ id, label: id, count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topLocations: [...locationMap.entries()]
      .map(([wilaya, c]) => ({ wilaya, count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    growthPct: 0,
  };
}

export function analyticsUsesDeviceOnly(): boolean {
  return !FEATURE_FLAGS.marketplaceMockAnalytics;
}
