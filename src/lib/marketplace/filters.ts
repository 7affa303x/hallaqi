import type {
  MarketplaceFilters,
  MarketplaceProduct,
  MarketplaceCategory,
} from '@/types/marketplace';
import { planTierRank } from '@/lib/marketplace/planAccess';

export function flattenCategories(categories: MarketplaceCategory[]): MarketplaceCategory[] {
  const out: MarketplaceCategory[] = [];
  for (const cat of categories) {
    out.push(cat);
    if (cat.children?.length) out.push(...flattenCategories(cat.children));
  }
  return out;
}

function matchesCategory(productCategoryId: string, filterCategoryId: string): boolean {
  if (productCategoryId === filterCategoryId) return true;
  if (productCategoryId.startsWith(`${filterCategoryId}_`)) return true;
  if (productCategoryId.split('_')[0] === filterCategoryId) return true;
  return false;
}

export function filterMarketplaceProducts(
  products: MarketplaceProduct[],
  filters: MarketplaceFilters = {}
): MarketplaceProduct[] {
  let list = products.filter(p => p.isActive);

  const q = filters.query?.trim().toLowerCase();
  if (q) {
    list = list.filter(p =>
      p.title.toLowerCase().includes(q)
      || p.description.toLowerCase().includes(q)
      || p.brand.toLowerCase().includes(q)
      || p.keywords.some(k => k.toLowerCase().includes(q))
      || (p.sellerName || '').toLowerCase().includes(q)
    );
  }

  if (filters.categoryId) {
    list = list.filter(p => matchesCategory(p.categoryId, filters.categoryId!));
  }

  if (filters.brand) {
    list = list.filter(p => p.brand.toLowerCase() === filters.brand!.toLowerCase());
  }

  if (filters.storeId) {
    list = list.filter(p => p.sellerId === filters.storeId);
  }

  if (filters.companyId) {
    list = list.filter(p => p.sellerId === filters.companyId && p.sellerType === 'company');
  }

  if (filters.sellerType) {
    list = list.filter(p => p.sellerType === filters.sellerType);
  }

  if (filters.wilaya) {
    list = list.filter(p => p.wilaya === filters.wilaya);
  }

  if (filters.deliveryArea) {
    list = list.filter(p => p.deliveryAreas.includes(filters.deliveryArea!));
  }

  if (filters.minPrice != null) {
    list = list.filter(p => p.priceDzd >= filters.minPrice!);
  }

  if (filters.maxPrice != null) {
    list = list.filter(p => p.priceDzd <= filters.maxPrice!);
  }

  if (filters.minRating != null) {
    list = list.filter(p => p.rating >= filters.minRating!);
  }

  if (filters.featuredOnly) {
    list = list.filter(p => p.isFeatured);
  }

  if (filters.premiumOnly) {
    list = list.filter(p => p.isPremiumVisibility);
  }

  if (filters.productOfTheDayOnly) {
    list = list.filter(p => p.isProductOfTheDay);
  }

  switch (filters.sortBy) {
    case 'newest':
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case 'price_asc':
      list.sort((a, b) => a.priceDzd - b.priceDzd);
      break;
    case 'price_desc':
      list.sort((a, b) => b.priceDzd - a.priceDzd);
      break;
    case 'rating':
      list.sort((a, b) => b.rating - a.rating);
      break;
    case 'featured':
      list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.popularityScore - a.popularityScore);
      break;
    case 'popularity':
    default:
      list.sort((a, b) =>
        Number(b.isProductOfTheDay) - Number(a.isProductOfTheDay)
        || planTierRank(b.subscriptionPlan) - planTierRank(a.subscriptionPlan)
        || Number(b.isPremiumVisibility) - Number(a.isPremiumVisibility)
        || Number(b.isFeatured) - Number(a.isFeatured)
        || b.popularityScore - a.popularityScore
      );
  }

  return list;
}

export function getProductOfTheDay(products: MarketplaceProduct[]): MarketplaceProduct | undefined {
  return products.find(p => p.isProductOfTheDay && p.isActive);
}

export function formatDzd(amount: number): string {
  return `${amount.toLocaleString('ar-DZ')} دج`;
}

export function discountPercent(price: number, compareAt?: number): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
