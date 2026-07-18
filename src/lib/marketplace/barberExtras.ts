import type { Barber, Service } from '@/types';
import type { MarketplaceProduct } from '@/types/marketplace';

const EXTRA_CATEGORIES = new Set(['beard', 'facial', 'hair_treatment', 'package', 'coloring']);

/**
 * Maps barber bookable extras into marketplace discovery cards.
 * These remain service extras — not store physical products.
 */
export function mapBarberExtrasToMarketplace(barbers: Barber[]): MarketplaceProduct[] {
  const out: MarketplaceProduct[] = [];
  for (const barber of barbers) {
    const extras = barber.services.filter(s => EXTRA_CATEGORIES.has(s.category) || /vip|مميز|عناية|علاج/i.test(s.name));
    for (const service of extras) {
      out.push(serviceToProduct(barber, service));
    }
  }
  return out;
}

function serviceToProduct(barber: Barber, service: Service): MarketplaceProduct {
  const categoryId = service.category === 'beard' ? 'beard'
    : service.category === 'facial' || service.category === 'hair_treatment' ? 'skin'
      : service.category === 'coloring' ? 'hair'
        : 'professional_tools';

  const plan = barber.subscriptionPlan;
  const isPremium =
    plan === 'premium' || plan === 'business' || plan === 'pro' || plan === 'professional';

  return {
    id: `barber-extra-${barber.id}-${service.id}`,
    sellerId: barber.id,
    sellerName: barber.name,
    sellerType: 'barber',
    subscriptionPlan: plan,
    categoryId,
    kind: 'service_extra',
    title: `${service.name} · ${barber.name}`,
    description: service.description || `خدمة إضافية عند الحلاق ${barber.name} — احجز عبر التطبيق.`,
    keywords: [service.name, barber.name, 'خدمة', 'إضافي'],
    brand: barber.name,
    priceDzd: service.price,
    imageUrls: [barber.coverImage || barber.avatar],
    imageCaptions: [service.name],
    wilaya: barber.wilaya,
    deliveryAreas: [barber.wilaya],
    isFeatured: barber.isSubscribed,
    isPremiumVisibility: isPremium,
    isProductOfTheDay: false,
    isBestseller: false,
    isNew: barber.tags.includes('new'),
    isActive: barber.isActive,
    rating: barber.rating,
    reviewCount: barber.reviewCount,
    popularityScore: Math.round(barber.rating * 20 + (barber.isSubscribed ? 40 : 0)),
    externalUrl: undefined,
    offerText: 'خدمة إضافية للحلاق — ليست منتج متجر فيزيائي',
    createdAt: new Date().toISOString(),
  };
}
