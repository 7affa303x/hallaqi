import { describe, expect, it } from 'vitest';
import { countActiveMarketplaceFilters } from '@/components/marketplace/MarketUI';

describe('countActiveMarketplaceFilters', () => {
  it('counts zero when empty', () => {
    expect(countActiveMarketplaceFilters({})).toBe(0);
  });

  it('counts multiple active filters', () => {
    expect(countActiveMarketplaceFilters({
      category: 'hair',
      featuredOnly: true,
      wilaya: 16,
      brand: 'X',
      minPrice: '100',
      minRating: 4,
      hideNoUrl: true,
    })).toBe(7);
  });
});
