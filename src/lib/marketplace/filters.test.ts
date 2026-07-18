import { describe, expect, it } from 'vitest';
import { filterMarketplaceProducts, getProductOfTheDay, discountPercent } from '@/lib/marketplace/filters';
import { marketplaceProducts } from '@/data/marketplaceSeed';

describe('marketplace filters', () => {
  it('returns product of the day', () => {
    const potd = getProductOfTheDay(marketplaceProducts);
    expect(potd?.id).toBe('prod-potd-1');
    expect(potd?.isProductOfTheDay).toBe(true);
  });

  it('filters by brand and premium', () => {
    const list = filterMarketplaceProducts(marketplaceProducts, {
      brand: 'BarberPro',
      premiumOnly: true,
    });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every(p => p.brand === 'BarberPro' && p.isPremiumVisibility)).toBe(true);
  });

  it('filters by category parent hair', () => {
    const list = filterMarketplaceProducts(marketplaceProducts, { categoryId: 'hair' });
    expect(list.some(p => p.categoryId === 'hair_oils')).toBe(true);
  });

  it('filters product of the day only', () => {
    const list = filterMarketplaceProducts(marketplaceProducts, { productOfTheDayOnly: true });
    expect(list).toHaveLength(1);
    expect(list[0].isProductOfTheDay).toBe(true);
  });

  it('computes discount percent for ad-style presentation', () => {
    expect(discountPercent(18900, 24900)).toBe(24);
    expect(discountPercent(100, 100)).toBeNull();
  });

  it('sorts by newest', () => {
    const list = filterMarketplaceProducts(marketplaceProducts, { sortBy: 'newest' });
    expect(list[0].createdAt >= list[1].createdAt).toBe(true);
  });

  it('weights popularity by subscription plan tier', () => {
    const list = filterMarketplaceProducts(marketplaceProducts, { sortBy: 'popularity' });
    const businessIdx = list.findIndex(p => p.subscriptionPlan === 'business');
    const freeIdx = list.findIndex(p => p.subscriptionPlan === 'free');
    if (businessIdx >= 0 && freeIdx >= 0) {
      expect(businessIdx).toBeLessThan(freeIdx);
    }
    expect(list[0].isProductOfTheDay || list[0].subscriptionPlan === 'business' || list[0].isPremiumVisibility).toBe(true);
  });
});
