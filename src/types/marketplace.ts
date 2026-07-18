/** Marketplace & multi-role commerce types (no commissions / no in-app checkout). */

export type MarketplaceSellerType = 'store' | 'company' | 'doctor';
export type MarketplaceApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type MarketplacePlanTier = 'free' | 'basic' | 'professional' | 'business';
export type MarketplaceProductKind = 'physical' | 'service_extra' | 'course' | 'device' | 'accessory';

export type MarketplacePlacementType =
  | 'featured_product'
  | 'featured_store'
  | 'product_of_the_day'
  | 'banner'
  | 'sponsored'
  | 'premium_badge';

export type MarketplaceAnalyticsEventType =
  | 'view'
  | 'click'
  | 'save'
  | 'profile_visit'
  | 'search_impression'
  | 'featured_impression'
  | 'featured_click'
  | 'visit_store'
  | 'product_of_day_view'
  | 'product_of_day_click';

export type PlatformAccountRole =
  | 'client'
  | 'barber'
  | 'store'
  | 'company'
  | 'doctor'
  | 'admin'
  | 'specialist'
  | 'moderator';

export interface MarketplaceCategory {
  id: string;
  parentId: string | null;
  nameAr: string;
  nameEn?: string;
  nameFr?: string;
  icon?: string;
  sortOrder: number;
  children?: MarketplaceCategory[];
}

export interface MarketplaceSeller {
  id: string;
  sellerType: MarketplaceSellerType;
  displayName: string;
  slug?: string;
  logoUrl: string;
  coverUrl: string;
  shortDescription: string;
  about: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks: Record<string, string>;
  wilaya: string;
  deliveryAreas: string[];
  brandName?: string;
  approvalStatus: MarketplaceApprovalStatus;
  isVerified: boolean;
  isPremium: boolean;
  isCompanyBadge: boolean;
  isTrustedDoctor: boolean;
  subscriptionPlan: MarketplacePlanTier;
  listingCap: number;
  rating: number;
  reviewCount: number;
  followerCount: number;
  isActive: boolean;
  featuredProductIds?: string[];
}

export interface MarketplaceProduct {
  id: string;
  sellerId: string;
  sellerName?: string;
  sellerType?: MarketplaceSellerType;
  categoryId: string;
  kind: MarketplaceProductKind;
  title: string;
  description: string;
  seoDescription?: string;
  keywords: string[];
  brand: string;
  priceDzd: number;
  compareAtPriceDzd?: number;
  imageUrls: string[];
  imageCaptions: string[];
  wilaya: string;
  deliveryAreas: string[];
  isFeatured: boolean;
  isPremiumVisibility: boolean;
  isProductOfTheDay: boolean;
  isBestseller: boolean;
  isNew: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  popularityScore: number;
  externalUrl?: string;
  offerText?: string;
  createdAt: string;
}

export interface MarketplaceReview {
  id: string;
  sellerId: string;
  productId?: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface MarketplaceSubscriptionPlan {
  id: MarketplacePlanTier;
  nameAr: string;
  nameEn: string;
  priceDzd: number;
  listingCap: number;
  featuredSlots: number;
  bannerSlots: number;
  analyticsLevel: 'basic' | 'standard' | 'advanced' | 'full';
  features: string[];
}

export interface MarketplacePlacement {
  id: string;
  placementType: MarketplacePlacementType;
  sellerId?: string;
  productId?: string;
  title?: string;
  bannerImageUrl?: string;
  bidAmountDzd: number;
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
}

export interface MarketplaceFilters {
  query?: string;
  categoryId?: string | null;
  brand?: string | null;
  storeId?: string | null;
  companyId?: string | null;
  wilaya?: string | null;
  deliveryArea?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minRating?: number | null;
  featuredOnly?: boolean;
  premiumOnly?: boolean;
  productOfTheDayOnly?: boolean;
  sellerType?: MarketplaceSellerType | null;
  sortBy?: 'popularity' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'featured';
}

export interface MarketplaceAnalyticsSummary {
  views: number;
  clicks: number;
  saves: number;
  profileVisits: number;
  searchImpressions: number;
  featuredImpressions: number;
  featuredClicks: number;
  visitStoreClicks: number;
  productOfDayViews: number;
  productOfDayClicks: number;
  topCategories: Array<{ id: string; label: string; count: number }>;
  topLocations: Array<{ wilaya: string; count: number }>;
  growthPct: number;
}

/** Premium listing hard cap — never unlimited. */
export const MARKETPLACE_PREMIUM_LISTING_CAP = 99;
