/**
 * Marketplace data access — tries Supabase first, falls back to seed/localStorage.
 * Ready for production once migrations are applied and env credentials are set.
 */
import {
  marketplaceCategories,
  marketplaceProducts,
  marketplaceSellers,
  marketplaceReviews,
  marketplacePlans,
  companyMarketplacePlans,
  marketplacePlacements,
} from '@/data/marketplaceSeed';
import type {
  MarketplaceFilters,
  MarketplaceProduct,
  MarketplaceSeller,
  MarketplaceReview,
  MarketplaceCategory,
  MarketplaceSubscriptionPlan,
  MarketplacePlacement,
  MarketplacePlanTier,
  MarketplaceProductKind,
  MarketplacePlacementType,
  MarketplaceAnalyticsEventType,
  MarketplaceApprovalStatus,
} from '@/types/marketplace';
import { MARKETPLACE_PREMIUM_LISTING_CAP } from '@/types/marketplace';
import { filterMarketplaceProducts, getProductOfTheDay } from '@/lib/marketplace/filters';
import {
  getAllSellerOwnedProducts,
  getSellerOwnedProducts,
  upsertSellerProduct,
  deactivateSellerProduct,
  getPlacementRequests,
  createPlacementRequest,
  reviewPlacementRequest,
  listingCapForPlan,
  type SellerPlacementRequest,
} from '@/lib/marketplace/sellerInventory';
import { isSupabaseConfigured, supabase } from '@/supabase/client';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

type Row = Record<string, unknown>;

/** True when live catalog is empty and seed would be misleading. */
export function shouldUseMarketplaceSeed(): boolean {
  if (!isSupabaseConfigured()) return true;
  return FEATURE_FLAGS.marketplaceSeedFallback;
}

function mapProduct(row: Row): MarketplaceProduct {
  const seller = row.marketplace_sellers as { display_name?: string; seller_type?: MarketplaceSeller['sellerType'] } | null;
  return {
    id: String(row.id),
    sellerId: String(row.seller_id),
    sellerName: seller?.display_name,
    sellerType: seller?.seller_type,
    categoryId: String(row.category_id || ''),
    kind: (row.kind as MarketplaceProductKind) || 'physical',
    title: String(row.title || ''),
    description: String(row.description || ''),
    seoDescription: row.seo_description ? String(row.seo_description) : undefined,
    keywords: (row.keywords as string[]) || [],
    brand: String(row.brand || ''),
    priceDzd: Number(row.price_dzd || 0),
    compareAtPriceDzd: row.compare_at_price_dzd != null ? Number(row.compare_at_price_dzd) : undefined,
    imageUrls: (row.image_urls as string[]) || [],
    imageCaptions: (row.image_captions as string[]) || [],
    wilaya: String(row.wilaya || ''),
    deliveryAreas: (row.delivery_areas as string[]) || [],
    isFeatured: Boolean(row.is_featured),
    isPremiumVisibility: Boolean(row.is_premium_visibility),
    isProductOfTheDay: Boolean(row.is_product_of_the_day),
    isBestseller: Boolean(row.is_bestseller),
    isNew: Boolean(row.is_new),
    isActive: Boolean(row.is_active),
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    popularityScore: Number(row.popularity_score || 0),
    externalUrl: row.external_url ? String(row.external_url) : undefined,
    offerText: row.offer_text ? String(row.offer_text) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapSeller(row: Row): MarketplaceSeller {
  return {
    id: String(row.id),
    sellerType: row.seller_type as MarketplaceSeller['sellerType'],
    displayName: String(row.display_name || ''),
    slug: row.slug ? String(row.slug) : undefined,
    logoUrl: String(row.logo_url || ''),
    coverUrl: String(row.cover_url || ''),
    shortDescription: String(row.short_description || ''),
    about: String(row.about || ''),
    websiteUrl: row.website_url ? String(row.website_url) : undefined,
    contactEmail: row.contact_email ? String(row.contact_email) : undefined,
    contactPhone: row.contact_phone ? String(row.contact_phone) : undefined,
    socialLinks: (row.social_links as Record<string, string>) || {},
    wilaya: String(row.wilaya || ''),
    deliveryAreas: (row.delivery_areas as string[]) || [],
    brandName: row.brand_name ? String(row.brand_name) : undefined,
    approvalStatus: (row.approval_status as MarketplaceApprovalStatus) || 'pending',
    isVerified: Boolean(row.is_verified),
    isPremium: Boolean(row.is_premium),
    isCompanyBadge: Boolean(row.is_company_badge),
    isTrustedDoctor: Boolean(row.is_trusted_doctor),
    subscriptionPlan: (row.subscription_plan as MarketplacePlanTier) || 'free',
    listingCap: Number(row.listing_cap || 12),
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    followerCount: Number(row.follower_count || 0),
    isActive: Boolean(row.is_active),
  };
}

async function tryRemoteProducts(): Promise<MarketplaceProduct[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('marketplace_products' as never)
      .select('*, marketplace_sellers(display_name, seller_type)')
      .eq('is_active', true)
      .limit(200);
    if (error || !data) return null;
    return (data as Row[]).map(mapProduct);
  } catch {
    return null;
  }
}

async function tryRemoteSellers(includeOwn = false): Promise<MarketplaceSeller[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    let query = supabase.from('marketplace_sellers' as never).select('*').limit(100);
    if (!includeOwn) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error || !data) return null;
    return (data as Row[]).map(mapSeller);
  } catch {
    return null;
  }
}

export async function getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('marketplace_categories' as never)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (!error && data && (data as Row[]).length > 0) {
        const rows = data as Row[];
        const roots = rows.filter(r => !r.parent_id).map(r => ({
          id: String(r.id),
          parentId: null as string | null,
          nameAr: String(r.name_ar || ''),
          nameEn: r.name_en ? String(r.name_en) : undefined,
          icon: r.icon ? String(r.icon) : undefined,
          sortOrder: Number(r.sort_order || 0),
          children: rows.filter(c => c.parent_id === r.id).map(c => ({
            id: String(c.id),
            parentId: String(c.parent_id),
            nameAr: String(c.name_ar || ''),
            nameEn: c.name_en ? String(c.name_en) : undefined,
            sortOrder: Number(c.sort_order || 0),
          })),
        }));
        return roots;
      }
    } catch { /* fallback */ }
  }
  return marketplaceCategories;
}

export async function getMarketplacePlans(sellerType?: 'store' | 'company' | 'doctor'): Promise<MarketplaceSubscriptionPlan[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('marketplace_subscription_plans' as never)
        .select('*')
        .eq('is_active', true);
      if (!error && data && (data as Row[]).length > 0) {
        return (data as Row[]).map(row => ({
          id: row.id as MarketplacePlanTier,
          nameAr: String(row.name_ar || ''),
          nameEn: String(row.name_en || ''),
          priceDzd: Number(row.price_dzd || 0),
          listingCap: Number(row.listing_cap || 12),
          featuredSlots: Number(row.featured_slots || 0),
          bannerSlots: Number(row.banner_slots || 0),
          analyticsLevel: (row.analytics_level as MarketplaceSubscriptionPlan['analyticsLevel']) || 'basic',
          features: (row.features as string[]) || [],
        }));
      }
    } catch { /* fallback */ }
  }
  if (sellerType === 'company') return companyMarketplacePlans;
  return marketplacePlans;
}

/** All sellers for admin review (includes pending local + optional seed). */
export async function getMarketplaceSellersForAdmin(): Promise<MarketplaceSeller[]> {
  const remote = await tryRemoteSellers(true);
  const local = typeof window !== 'undefined' ? readLocalSellers() : [];
  const seed = shouldUseMarketplaceSeed() ? marketplaceSellers : [];
  const byId = new Map<string, MarketplaceSeller>();
  for (const s of [...seed, ...(remote || []), ...local]) byId.set(s.id, s);
  return [...byId.values()].sort((a, b) => {
    const order = { pending: 0, approved: 1, rejected: 2, suspended: 3 };
    return (order[a.approvalStatus] ?? 9) - (order[b.approvalStatus] ?? 9);
  });
}

export async function requestDoctorFreeVerification(sellerId: string): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('marketplace_sellers' as never)
        .update({
          // Free verification request — admin still approves account
          short_description: 'طلب توثيق دكتور مجاني',
        } as never)
        .eq('id', sellerId)
        .eq('seller_type', 'doctor');
      if (error) return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'فشل' };
    }
  }
  const current = (await getMarketplaceSellerById(sellerId)) || buildLocalSellerStub(sellerId, { sellerType: 'doctor' });
  const next: MarketplaceSeller = {
    ...current,
    sellerType: 'doctor',
    // Marks verification requested; admin approval sets isVerified / isTrustedDoctor
    shortDescription: current.shortDescription || 'طلب توثيق دكتور مجاني قيد المراجعة',
  };
  saveLocalSeller(next);
  try {
    localStorage.setItem(`hallaqi-doctor-verify-${sellerId}`, 'requested');
  } catch { /* ignore */ }
  return { ok: true };
}

export async function getMarketplacePlacements(): Promise<MarketplacePlacement[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('marketplace_placements' as never)
        .select('*')
        .eq('is_active', true);
      if (!error && data) {
        if ((data as Row[]).length > 0) {
          return (data as Row[]).map(row => ({
            id: String(row.id),
            placementType: row.placement_type as MarketplacePlacementType,
            sellerId: row.seller_id ? String(row.seller_id) : undefined,
            productId: row.product_id ? String(row.product_id) : undefined,
            title: row.title ? String(row.title) : undefined,
            bannerImageUrl: row.banner_image_url ? String(row.banner_image_url) : undefined,
            bidAmountDzd: Number(row.bid_amount_dzd || 0),
            startsAt: String(row.starts_at || ''),
            endsAt: row.ends_at ? String(row.ends_at) : undefined,
            isActive: Boolean(row.is_active),
          }));
        }
        if (!shouldUseMarketplaceSeed()) return [];
      }
    } catch { /* fallback */ }
  }
  return shouldUseMarketplaceSeed() ? marketplacePlacements : [];
}

export async function getMarketplaceSellers(): Promise<MarketplaceSeller[]> {
  const remote = await tryRemoteSellers();
  if (remote && remote.length > 0) {
    return remote.filter(s => s.approvalStatus === 'approved' && s.isActive);
  }
  if (!shouldUseMarketplaceSeed()) return [];
  return marketplaceSellers.filter(s => s.approvalStatus === 'approved' && s.isActive);
}

export async function getMarketplaceSellerById(id: string): Promise<MarketplaceSeller | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('marketplace_sellers' as never)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) return mapSeller(data as Row);
    } catch { /* fallback */ }
  }
  const sellers = await getMarketplaceSellers();
  return sellers.find(s => s.id === id)
    || marketplaceSellers.find(s => s.id === id)
    || buildLocalSellerStub(id);
}

/** Ensures a seller profile exists for the logged-in store/company/doctor. */
export async function ensureMarketplaceSellerProfile(input: {
  id: string;
  sellerType: 'store' | 'company' | 'doctor';
  displayName: string;
  contactEmail?: string;
}): Promise<MarketplaceSeller> {
  if (isSupabaseConfigured()) {
    try {
      const existing = await getMarketplaceSellerById(input.id);
      if (existing && existing.id === input.id && !existing.id.startsWith('demo-')) {
        // remote or seed hit — if seed id mismatch, create remote
        const { data } = await supabase
          .from('marketplace_sellers' as never)
          .select('id')
          .eq('id', input.id)
          .maybeSingle();
        if (data) return (await getMarketplaceSellerById(input.id))!;
      }

      const payload = {
        id: input.id,
        seller_type: input.sellerType,
        display_name: input.displayName,
        contact_email: input.contactEmail || null,
        approval_status: 'pending',
        is_company_badge: input.sellerType === 'company',
        listing_cap: 12,
        subscription_plan: 'free',
        is_active: true,
      };
      const { error } = await supabase
        .from('marketplace_sellers' as never)
        .upsert(payload as never, { onConflict: 'id' });
      if (!error) {
        const created = await getMarketplaceSellerById(input.id);
        if (created) return created;
      }
    } catch { /* fallback */ }
  }

  // Local stub persisted lightly for demo dashboards
  const stub = buildLocalSellerStub(input.id, input);
  saveLocalSeller(stub);
  return stub;
}

const LOCAL_SELLERS_KEY = 'hallaqi-local-sellers';

function readLocalSellers(): MarketplaceSeller[] {
  try {
    const raw = localStorage.getItem(LOCAL_SELLERS_KEY);
    return raw ? JSON.parse(raw) as MarketplaceSeller[] : [];
  } catch {
    return [];
  }
}

function saveLocalSeller(seller: MarketplaceSeller) {
  try {
    const all = readLocalSellers().filter(s => s.id !== seller.id);
    localStorage.setItem(LOCAL_SELLERS_KEY, JSON.stringify([seller, ...all]));
  } catch { /* ignore */ }
}

function buildLocalSellerStub(
  id: string,
  input?: { sellerType?: 'store' | 'company' | 'doctor'; displayName?: string; contactEmail?: string }
): MarketplaceSeller {
  const local = readLocalSellers().find(s => s.id === id);
  if (local) return local;
  const type = input?.sellerType || 'store';
  return {
    id,
    sellerType: type,
    displayName: input?.displayName || 'متجري',
    logoUrl: '',
    coverUrl: '',
    shortDescription: '',
    about: '',
    websiteUrl: '',
    contactEmail: input?.contactEmail,
    socialLinks: {},
    wilaya: 'الجزائر',
    deliveryAreas: ['الجزائر'],
    approvalStatus: 'pending',
    isVerified: false,
    isPremium: false,
    isCompanyBadge: type === 'company',
    isTrustedDoctor: false,
    subscriptionPlan: 'free',
    listingCap: 12,
    rating: 0,
    reviewCount: 0,
    followerCount: 0,
    isActive: true,
  };
}

export async function updateMarketplaceSellerProfile(
  sellerId: string,
  patch: Partial<{
    displayName: string;
    shortDescription: string;
    about: string;
    websiteUrl: string;
    contactEmail: string;
    contactPhone: string;
    wilaya: string;
    deliveryAreas: string[];
    brandName: string;
    logoUrl: string;
    coverUrl: string;
    socialLinks: Record<string, string>;
  }>
): Promise<{ ok: true; seller: MarketplaceSeller } | { ok: false; error: string }> {
  if (isSupabaseConfigured()) {
    try {
      const payload: Row = {};
      if (patch.displayName != null) payload.display_name = patch.displayName;
      if (patch.shortDescription != null) payload.short_description = patch.shortDescription;
      if (patch.about != null) payload.about = patch.about;
      if (patch.websiteUrl != null) payload.website_url = patch.websiteUrl;
      if (patch.contactEmail != null) payload.contact_email = patch.contactEmail;
      if (patch.contactPhone != null) payload.contact_phone = patch.contactPhone;
      if (patch.wilaya != null) payload.wilaya = patch.wilaya;
      if (patch.deliveryAreas != null) payload.delivery_areas = patch.deliveryAreas;
      if (patch.brandName != null) payload.brand_name = patch.brandName;
      if (patch.logoUrl != null) payload.logo_url = patch.logoUrl;
      if (patch.coverUrl != null) payload.cover_url = patch.coverUrl;
      if (patch.socialLinks != null) payload.social_links = patch.socialLinks;

      const { error } = await supabase
        .from('marketplace_sellers' as never)
        .update(payload as never)
        .eq('id', sellerId);
      if (!error) {
        const seller = await getMarketplaceSellerById(sellerId);
        if (seller) return { ok: true, seller };
      }
    } catch { /* fallback */ }
  }

  const current = (await getMarketplaceSellerById(sellerId)) || buildLocalSellerStub(sellerId);
  const next: MarketplaceSeller = {
    ...current,
    displayName: patch.displayName ?? current.displayName,
    shortDescription: patch.shortDescription ?? current.shortDescription,
    about: patch.about ?? current.about,
    websiteUrl: patch.websiteUrl ?? current.websiteUrl,
    contactEmail: patch.contactEmail ?? current.contactEmail,
    contactPhone: patch.contactPhone ?? current.contactPhone,
    wilaya: patch.wilaya ?? current.wilaya,
    deliveryAreas: patch.deliveryAreas ?? current.deliveryAreas,
    brandName: patch.brandName ?? current.brandName,
    logoUrl: patch.logoUrl ?? current.logoUrl,
    coverUrl: patch.coverUrl ?? current.coverUrl,
    socialLinks: patch.socialLinks ?? current.socialLinks,
  };
  saveLocalSeller(next);
  return { ok: true, seller: next };
}

export async function getMarketplaceProducts(filters: MarketplaceFilters = {}): Promise<MarketplaceProduct[]> {
  const remote = await tryRemoteProducts();
  const base =
    remote && remote.length > 0
      ? remote
      : shouldUseMarketplaceSeed()
        ? marketplaceProducts
        : [];
  const owned = typeof window !== 'undefined' ? getAllSellerOwnedProducts() : [];
  const merged = [...owned, ...base.filter(p => !owned.some(o => o.id === p.id))];
  return filterMarketplaceProducts(merged, filters);
}

export async function getMarketplaceProductById(id: string): Promise<MarketplaceProduct | undefined> {
  const products = await getMarketplaceProducts();
  return products.find(p => p.id === id) || marketplaceProducts.find(p => p.id === id);
}

export async function getSellerProducts(sellerId: string): Promise<MarketplaceProduct[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('marketplace_products' as never)
        .select('*, marketplace_sellers(display_name, seller_type)')
        .eq('seller_id', sellerId)
        .eq('is_active', true);
      if (!error && data) {
        const remote = (data as Row[]).map(mapProduct);
        const owned = getSellerOwnedProducts(sellerId).filter(p => !remote.some(r => r.id === p.id));
        return [...owned, ...remote];
      }
    } catch { /* fallback */ }
  }
  const remote = await tryRemoteProducts();
  const all = remote && remote.length > 0 ? remote : (shouldUseMarketplaceSeed() ? marketplaceProducts : []);
  const owned = getSellerOwnedProducts(sellerId);
  return [...owned, ...all.filter(p => p.sellerId === sellerId && !owned.some(o => o.id === p.id))]
    .filter(p => p.isActive);
}

export async function createOrUpdateSellerProduct(
  sellerId: string,
  plan: MarketplacePlanTier,
  input: Parameters<typeof upsertSellerProduct>[2]
): Promise<{ ok: true; product: MarketplaceProduct } | { ok: false; error: string }> {
  const local = upsertSellerProduct(sellerId, plan, input);
  if (!local.ok) return local;

  if (isSupabaseConfigured()) {
    try {
      const payload = {
        id: local.product.id.startsWith('local-') ? undefined : local.product.id,
        seller_id: sellerId,
        category_id: local.product.categoryId,
        kind: local.product.kind,
        title: local.product.title,
        description: local.product.description,
        seo_description: local.product.seoDescription || null,
        keywords: local.product.keywords,
        brand: local.product.brand,
        price_dzd: local.product.priceDzd,
        compare_at_price_dzd: local.product.compareAtPriceDzd ?? null,
        image_urls: local.product.imageUrls,
        wilaya: local.product.wilaya,
        delivery_areas: local.product.deliveryAreas,
        external_url: local.product.externalUrl || null,
        offer_text: local.product.offerText || null,
        is_active: true,
        is_new: true,
      };
      const { data, error } = await supabase
        .from('marketplace_products' as never)
        .upsert(payload as never)
        .select('*, marketplace_sellers(display_name, seller_type)')
        .maybeSingle();
      if (!error && data) {
        return { ok: true, product: mapProduct(data as Row) };
      }
    } catch { /* keep local */ }
  }
  return local;
}

export async function removeSellerProduct(sellerId: string, productId: string): Promise<void> {
  deactivateSellerProduct(sellerId, productId);
  if (isSupabaseConfigured() && !productId.startsWith('local-')) {
    try {
      await supabase
        .from('marketplace_products' as never)
        .update({ is_active: false } as never)
        .eq('id', productId)
        .eq('seller_id', sellerId);
    } catch { /* ignore */ }
  }
}

export async function requestMarketplaceSubscription(
  sellerId: string,
  planId: MarketplacePlanTier
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('marketplace_subscription_requests' as never)
        .insert({
          seller_id: sellerId,
          plan_id: planId,
          status: 'pending',
        } as never);
      if (!error) return { ok: true };
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'فشل الطلب' };
    }
  }
  try {
    const key = 'hallaqi-marketplace-sub-requests';
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) as Array<Record<string, string>> : [];
    list.unshift({
      id: `sub-${crypto.randomUUID()}`,
      seller_id: sellerId,
      plan_id: planId,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    return { ok: true };
  } catch {
    return { ok: false, error: 'تعذر حفظ الطلب محلياً' };
  }
}

export async function requestMarketplacePlacement(input: {
  sellerId: string;
  placementType: MarketplacePlacementType;
  productId?: string;
  bidAmountDzd: number;
  title: string;
}): Promise<SellerPlacementRequest> {
  const local = createPlacementRequest(input);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('marketplace_placement_requests' as never).insert({
        seller_id: input.sellerId,
        product_id: input.productId || null,
        placement_type: input.placementType,
        bid_amount_dzd: input.bidAmountDzd,
        title: input.title,
        status: 'pending',
      } as never);
    } catch { /* keep local */ }
  }
  return local;
}

export async function listPlacementRequests(sellerId?: string): Promise<SellerPlacementRequest[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('marketplace_placement_requests' as never).select('*').order('created_at', { ascending: false });
      if (sellerId) query = query.eq('seller_id', sellerId);
      const { data, error } = await query;
      if (!error && data && (data as Row[]).length > 0) {
        return (data as Row[]).map(row => ({
          id: String(row.id),
          sellerId: String(row.seller_id),
          placementType: row.placement_type as MarketplacePlacementType,
          productId: row.product_id ? String(row.product_id) : undefined,
          bidAmountDzd: Number(row.bid_amount_dzd || 0),
          title: String(row.title || ''),
          status: row.status as SellerPlacementRequest['status'],
          createdAt: String(row.created_at || ''),
        }));
      }
    } catch { /* fallback */ }
  }
  return getPlacementRequests(sellerId);
}

export async function adminReviewSeller(sellerId: string, approve: boolean): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.rpc('admin_review_marketplace_seller' as never, {
        target_seller: sellerId,
        approve,
      } as never);
      if (!error) return { ok: true };
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'فشل' };
    }
  }
  const sellers = readLocalSellers();
  const next = sellers.map(s => s.id === sellerId
    ? {
        ...s,
        approvalStatus: (approve ? 'approved' : 'rejected') as MarketplaceApprovalStatus,
        isVerified: approve,
        isTrustedDoctor: approve && s.sellerType === 'doctor' ? true : s.isTrustedDoctor,
      }
    : s);
  try { localStorage.setItem(LOCAL_SELLERS_KEY, JSON.stringify(next)); } catch { /* */ }
  return { ok: true };
}

export async function adminSetProductOfDay(productId: string, bid = 0): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.rpc('admin_set_product_of_the_day' as never, {
        target_product: productId,
        bid,
      } as never);
      if (!error) return { ok: true };
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'فشل' };
    }
  }
  return { ok: true };
}

export async function adminReviewPlacement(requestId: string, approve: boolean): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured() && !requestId.startsWith('place-req-')) {
    try {
      const { error } = await supabase.rpc('admin_review_marketplace_placement' as never, {
        request_id: requestId,
        approve,
      } as never);
      if (!error) return { ok: true };
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'فشل' };
    }
  }
  reviewPlacementRequest(requestId, approve);
  return { ok: true };
}

export async function adminActivateMarketplaceSubscription(
  requestId: string,
  approve: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.rpc('admin_activate_marketplace_subscription' as never, {
        request_id: requestId,
        approve,
      } as never);
      if (!error) return { ok: true };
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'فشل' };
    }
  }
  return { ok: true };
}

export async function trackMarketplaceEventRemote(
  eventType: MarketplaceAnalyticsEventType,
  payload: { sellerId?: string; productId?: string; wilaya?: string; categoryId?: string } = {}
) {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('marketplace_analytics_events' as never).insert({
      event_type: eventType,
      seller_id: payload.sellerId || null,
      product_id: payload.productId || null,
      wilaya: payload.wilaya || null,
      category_id: payload.categoryId || null,
      metadata: {},
    } as never);
  } catch { /* fire-and-forget */ }
}

export async function getProductOfTheDayProduct(): Promise<MarketplaceProduct | undefined> {
  const products = await getMarketplaceProducts();
  return getProductOfTheDay(products);
}

export async function getSellerReviews(sellerId: string): Promise<MarketplaceReview[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('marketplace_reviews' as never)
        .select('*, profiles(full_name)')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        return (data as Row[]).map(row => ({
          id: String(row.id),
          sellerId: String(row.seller_id),
          productId: row.product_id ? String(row.product_id) : undefined,
          reviewerName: (row.profiles as { full_name?: string } | null)?.full_name || 'مستخدم',
          rating: Number(row.rating || 0),
          comment: String(row.comment || ''),
          createdAt: String(row.created_at || ''),
        }));
      }
    } catch { /* fallback */ }
  }
  return marketplaceReviews.filter(r => r.sellerId === sellerId);
}

export async function createSellerReview(input: {
  sellerId: string;
  productId?: string;
  reviewerId: string;
  rating: number;
  comment: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('marketplace_reviews' as never).insert({
        seller_id: input.sellerId,
        product_id: input.productId || null,
        reviewer_id: input.reviewerId,
        rating: input.rating,
        comment: input.comment,
      } as never);
      if (!error) return { ok: true };
      return { ok: false, error: error.message };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'فشل' };
    }
  }
  return { ok: true };
}

import { sanitizeExternalHttpsUrl } from '@/lib/marketplace/externalUrl';

export function openExternalStore(url?: string) {
  const safe = sanitizeExternalHttpsUrl(url);
  if (!safe) return;
  window.open(safe, '_blank', 'noopener,noreferrer');
}

export { listingCapForPlan, MARKETPLACE_PREMIUM_LISTING_CAP };
