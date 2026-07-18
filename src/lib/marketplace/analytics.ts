import type { MarketplaceAnalyticsEventType, MarketplaceAnalyticsSummary } from '@/types/marketplace';
import { mockMarketplaceAnalytics } from '@/data/marketplaceSeed';

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

/** Fire-and-forget marketplace analytics (local + optional remote later). */
export function trackMarketplaceEvent(
  eventType: MarketplaceAnalyticsEventType,
  payload: { sellerId?: string; productId?: string; wilaya?: string; categoryId?: string } = {}
) {
  const events = readEvents();
  events.push({ eventType, ...payload, at: new Date().toISOString() });
  writeEvents(events);
}

export function summarizeMarketplaceAnalytics(sellerId?: string): MarketplaceAnalyticsSummary {
  const events = readEvents().filter(e => !sellerId || e.sellerId === sellerId);
  if (events.length < 5) {
    return sellerId
      ? {
          ...mockMarketplaceAnalytics,
          views: Math.round(mockMarketplaceAnalytics.views * 0.35),
          clicks: Math.round(mockMarketplaceAnalytics.clicks * 0.35),
        }
      : mockMarketplaceAnalytics;
  }

  const count = (type: MarketplaceAnalyticsEventType) => events.filter(e => e.eventType === type).length;
  const categoryMap = new Map<string, number>();
  const locationMap = new Map<string, number>();
  for (const e of events) {
    if (e.categoryId) categoryMap.set(e.categoryId, (categoryMap.get(e.categoryId) || 0) + 1);
    if (e.wilaya) locationMap.set(e.wilaya, (locationMap.get(e.wilaya) || 0) + 1);
  }

  return {
    views: count('view'),
    clicks: count('click'),
    saves: count('save'),
    profileVisits: count('profile_visit'),
    searchImpressions: count('search_impression'),
    featuredImpressions: count('featured_impression'),
    featuredClicks: count('featured_click'),
    visitStoreClicks: count('visit_store'),
    productOfDayViews: count('product_of_day_view'),
    productOfDayClicks: count('product_of_day_click'),
    topCategories: [...categoryMap.entries()]
      .map(([id, c]) => ({ id, label: id, count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topLocations: [...locationMap.entries()]
      .map(([wilaya, c]) => ({ wilaya, count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    growthPct: 12.5,
  };
}
