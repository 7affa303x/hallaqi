import {
  marketplaceCategories,
  marketplaceProducts,
  marketplaceSellers,
  marketplaceReviews,
  marketplacePlans,
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
} from '@/types/marketplace';
import { filterMarketplaceProducts, getProductOfTheDay } from '@/lib/marketplace/filters';
import { isSupabaseConfigured, supabase } from '@/supabase/client';

async function tryRemoteProducts(): Promise<MarketplaceProduct[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('marketplace_products' as never)
      .select('*, marketplace_sellers(display_name, seller_type)')
      .eq('is_active', true)
      .limit(200);
    if (error || !data) return null;
    return (data as Array<Record<string, unknown>>).map(row => ({
      id: String(row.id),
      sellerId: String(row.seller_id),
      sellerName: (row.marketplace_sellers as { display_name?: string } | null)?.display_name,
      sellerType: (row.marketplace_sellers as { seller_type?: MarketplaceSeller['sellerType'] } | null)?.seller_type,
      categoryId: String(row.category_id || ''),
      kind: (row.kind as MarketplaceProduct['kind']) || 'physical',
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
    }));
  } catch {
    return null;
  }
}

async function tryRemoteSellers(): Promise<MarketplaceSeller[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('marketplace_sellers' as never)
      .select('*')
      .eq('is_active', true)
      .limit(100);
    if (error || !data) return null;
    return (data as Array<Record<string, unknown>>).map(row => ({
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
      approvalStatus: (row.approval_status as MarketplaceSeller['approvalStatus']) || 'pending',
      isVerified: Boolean(row.is_verified),
      isPremium: Boolean(row.is_premium),
      isCompanyBadge: Boolean(row.is_company_badge),
      isTrustedDoctor: Boolean(row.is_trusted_doctor),
      subscriptionPlan: (row.subscription_plan as MarketplaceSeller['subscriptionPlan']) || 'free',
      listingCap: Number(row.listing_cap || 12),
      rating: Number(row.rating || 0),
      reviewCount: Number(row.review_count || 0),
      followerCount: Number(row.follower_count || 0),
      isActive: Boolean(row.is_active),
    }));
  } catch {
    return null;
  }
}

export async function getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
  return marketplaceCategories;
}

export async function getMarketplacePlans(): Promise<MarketplaceSubscriptionPlan[]> {
  return marketplacePlans;
}

export async function getMarketplacePlacements(): Promise<MarketplacePlacement[]> {
  return marketplacePlacements;
}

export async function getMarketplaceSellers(): Promise<MarketplaceSeller[]> {
  const remote = await tryRemoteSellers();
  return (remote && remote.length > 0 ? remote : marketplaceSellers)
    .filter(s => s.approvalStatus === 'approved' && s.isActive);
}

export async function getMarketplaceSellerById(id: string): Promise<MarketplaceSeller | undefined> {
  const sellers = await getMarketplaceSellers();
  return sellers.find(s => s.id === id) || marketplaceSellers.find(s => s.id === id);
}

export async function getMarketplaceProducts(filters: MarketplaceFilters = {}): Promise<MarketplaceProduct[]> {
  const remote = await tryRemoteProducts();
  const base = remote && remote.length > 0 ? remote : marketplaceProducts;
  return filterMarketplaceProducts(base, filters);
}

export async function getMarketplaceProductById(id: string): Promise<MarketplaceProduct | undefined> {
  const products = await getMarketplaceProducts();
  return products.find(p => p.id === id) || marketplaceProducts.find(p => p.id === id);
}

export async function getSellerProducts(sellerId: string): Promise<MarketplaceProduct[]> {
  const remote = await tryRemoteProducts();
  const all = remote && remote.length > 0 ? remote : marketplaceProducts;
  return all.filter(p => p.sellerId === sellerId && p.isActive);
}

export async function getProductOfTheDayProduct(): Promise<MarketplaceProduct | undefined> {
  const products = await getMarketplaceProducts();
  return getProductOfTheDay(products);
}

export async function getSellerReviews(sellerId: string): Promise<MarketplaceReview[]> {
  return marketplaceReviews.filter(r => r.sellerId === sellerId);
}

export function openExternalStore(url?: string) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
