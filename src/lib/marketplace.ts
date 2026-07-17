import { supabase, isSupabaseConfigured } from '@/supabase/client';

export type MarketplaceOwnerType = 'store' | 'company';
export type BusinessAccountType = 'store' | 'company' | 'doctor';

export interface MarketplaceCategory {
  id: string;
  name_ar: string;
  name_en: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  icon: string | null;
}

export interface MarketplaceProduct {
  id: string;
  owner_type: MarketplaceOwnerType;
  store_id: string | null;
  company_id: string | null;
  category_id: string | null;
  title: string;
  description: string | null;
  seo_text: string | null;
  keywords: string[];
  brand: string | null;
  price_dzd: number | null;
  compare_at_price_dzd: number | null;
  currency: string;
  image_urls: string[];
  external_url: string | null;
  wilaya_code: number | null;
  delivery_areas: string[];
  is_active: boolean;
  is_featured: boolean;
  is_premium_placement: boolean;
  is_best_seller: boolean;
  is_new: boolean;
  popularity_score: number;
  average_rating: number;
  review_count: number;
  created_at: string;
  stores?: StoreRow | null;
  companies?: CompanyRow | null;
}

export interface StoreRow {
  id: string;
  store_name: string;
  slug: string | null;
  logo_url: string | null;
  cover_url: string | null;
  short_description: string | null;
  about: string | null;
  website_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  social_links: Record<string, string>;
  wilaya_code: number | null;
  city: string | null;
  delivery_areas: string[];
  approval_status: string;
  is_premium: boolean;
  is_featured: boolean;
  premium_item_cap: number;
  average_rating: number;
  review_count: number;
}

export interface CompanyRow {
  id: string;
  company_name: string;
  slug: string | null;
  logo_url: string | null;
  cover_url: string | null;
  short_description: string | null;
  about: string | null;
  website_url: string | null;
  approval_status: string;
  has_company_badge: boolean;
  is_premium: boolean;
  is_featured: boolean;
  premium_item_cap: number;
  trust_tag: string;
}

export interface ProductOfTheDayRow {
  id: string;
  product_id: string;
  store_id: string | null;
  placement_date: string;
  bid_amount_dzd: number;
  display_discount_percent: number | null;
  headline_ar: string | null;
  is_active: boolean;
  marketplace_products?: MarketplaceProduct | null;
}

export interface MarketplaceFilters {
  q?: string;
  category?: string;
  brand?: string;
  storeId?: string;
  companyId?: string;
  wilaya?: number;
  deliveryArea?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: 'popularity' | 'newest' | 'featured' | 'premium' | 'price_asc' | 'price_desc';
  featuredOnly?: boolean;
  premiumOnly?: boolean;
  todayOnly?: boolean;
}

function emptyConfigured<T>(fallback: T): T {
  if (!isSupabaseConfigured()) return fallback;
  return fallback;
}

export async function getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('marketplace_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data || []) as MarketplaceCategory[];
}

export async function getProductOfTheDay(): Promise<ProductOfTheDayRow | null> {
  if (!isSupabaseConfigured()) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('product_of_the_day')
    .select('*, marketplace_products(*, stores(*), companies(*))')
    .eq('placement_date', today)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data as ProductOfTheDayRow | null;
}

export async function searchMarketplaceProducts(filters: MarketplaceFilters = {}): Promise<MarketplaceProduct[]> {
  if (!isSupabaseConfigured()) return [];
  let query = supabase
    .from('marketplace_products')
    .select('*, stores(*), companies(*)')
    .eq('is_active', true);

  if (filters.category) query = query.eq('category_id', filters.category);
  if (filters.brand) query = query.ilike('brand', `%${filters.brand}%`);
  if (filters.storeId) query = query.eq('store_id', filters.storeId);
  if (filters.companyId) query = query.eq('company_id', filters.companyId);
  if (filters.wilaya) query = query.eq('wilaya_code', filters.wilaya);
  if (filters.deliveryArea) query = query.contains('delivery_areas', [filters.deliveryArea]);
  if (filters.minPrice != null) query = query.gte('price_dzd', filters.minPrice);
  if (filters.maxPrice != null) query = query.lte('price_dzd', filters.maxPrice);
  if (filters.minRating != null) query = query.gte('average_rating', filters.minRating);
  if (filters.featuredOnly) query = query.eq('is_featured', true);
  if (filters.premiumOnly) query = query.eq('is_premium_placement', true);
  if (filters.q) query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%,brand.ilike.%${filters.q}%`);

  switch (filters.sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'featured':
      query = query.order('is_featured', { ascending: false }).order('popularity_score', { ascending: false });
      break;
    case 'premium':
      query = query.order('is_premium_placement', { ascending: false }).order('popularity_score', { ascending: false });
      break;
    case 'price_asc':
      query = query.order('price_dzd', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price_dzd', { ascending: false });
      break;
    default:
      query = query.order('popularity_score', { ascending: false });
  }

  const { data, error } = await query.limit(60);
  if (error) throw error;
  return (data || []) as MarketplaceProduct[];
}

export async function getStoreById(storeId: string): Promise<StoreRow | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from('stores').select('*').eq('id', storeId).maybeSingle();
  if (error) throw error;
  return data as StoreRow | null;
}

export async function getStoreProducts(storeId: string): Promise<MarketplaceProduct[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('marketplace_products')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as MarketplaceProduct[];
}

export async function getFeaturedStores(): Promise<StoreRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('approval_status', 'approved')
    .eq('is_featured', true)
    .limit(12);
  if (error) throw error;
  return (data || []) as StoreRow[];
}

export async function trackMarketplaceEvent(input: {
  event_type: string;
  store_id?: string | null;
  company_id?: string | null;
  product_id?: string | null;
  category_id?: string | null;
  wilaya_code?: number | null;
  meta?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured()) return;
  void supabase.from('marketplace_analytics_events').insert({
    event_type: input.event_type,
    store_id: input.store_id ?? null,
    company_id: input.company_id ?? null,
    product_id: input.product_id ?? null,
    category_id: input.category_id ?? null,
    wilaya_code: input.wilaya_code ?? null,
    meta: (input.meta ?? {}) as import('@/types/supabase').Json,
  }).then(() => {}, () => {});
}

export async function getOwnerAnalyticsSummary(ownerId: string, ownerType: 'store' | 'company') {
  if (!isSupabaseConfigured()) {
    return emptyConfigured({
      views: 0, clicks: 0, saves: 0, profile_visits: 0, search_impressions: 0,
      product_of_day: 0, featured_slot: 0, visit_store: 0,
    });
  }
  const column = ownerType === 'store' ? 'store_id' : 'company_id';
  const { data, error } = await supabase
    .from('marketplace_analytics_events')
    .select('event_type')
    .eq(column, ownerId)
    .limit(5000);
  if (error) throw error;
  const counts = {
    views: 0, clicks: 0, saves: 0, profile_visits: 0, search_impressions: 0,
    product_of_day: 0, featured_slot: 0, visit_store: 0,
  };
  for (const row of data || []) {
    const t = row.event_type as string;
    if (t === 'view') counts.views++;
    else if (t === 'click') counts.clicks++;
    else if (t === 'save') counts.saves++;
    else if (t === 'profile_visit') counts.profile_visits++;
    else if (t === 'search_impression') counts.search_impressions++;
    else if (t === 'product_of_day_view') counts.product_of_day++;
    else if (t === 'featured_slot_view') counts.featured_slot++;
    else if (t === 'visit_store_click') counts.visit_store++;
  }
  return counts;
}

export async function submitBusinessAccountRequest(
  userId: string,
  accountType: BusinessAccountType,
  payload: Record<string, unknown>
) {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');
  const { data, error } = await supabase.from('business_account_requests').insert({
    user_id: userId,
    account_type: accountType,
    payload: payload as import('@/types/supabase').Json,
    status: 'pending',
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function adminListBusinessAccountRequests() {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('business_account_requests')
    .select('*, profiles!business_account_requests_user_id_fkey(full_name, user_role, user_status)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminReviewBusinessAccountRequest(requestId: string, approve: boolean, notes?: string) {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');
  const { error } = await supabase.rpc('review_business_account_request', {
    p_request_id: requestId,
    p_approve: approve,
    p_notes: notes ?? undefined,
  });
  if (error) throw error;
}

export async function getSubscriptionPlansByBusiness(businessType: 'barber' | 'store' | 'company') {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .eq('business_type', businessType)
    .order('price_dzd');
  if (error) throw error;
  return data || [];
}

/** Open merchant website in-app WebView when possible; else external browser. */
export function openVisitStore(url: string) {
  if (!url) return;
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  trackMarketplaceEvent({ event_type: 'visit_store_click', meta: { url: normalized } });

  // Prefer in-app webview screen; caller may also navigate('store-webview').
  try {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      window.open(normalized, '_blank', 'noopener,noreferrer');
      return;
    }
  } catch {
    /* ignore */
  }
  window.open(normalized, '_blank', 'noopener,noreferrer');
}
