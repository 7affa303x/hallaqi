import { describe, expect, it } from 'vitest';
import { mapBarberExtrasToMarketplace } from '@/lib/marketplace/barberExtras';
import type { Barber } from '@/types';

const barber = {
  id: 'b1',
  name: 'حلاق تجريبي',
  avatar: '',
  coverImage: 'https://example.com/c.jpg',
  rating: 4.8,
  reviewCount: 10,
  location: 'الجزائر',
  wilaya: 'الجزائر',
  distance: '1km',
  isActive: true,
  isVerified: true,
  tags: ['verified'],
  services: [
    { id: 's1', name: 'قص كلاسيكي', price: 300, duration: 30, category: 'haircut' },
    { id: 's2', name: 'عناية VIP لحية', price: 800, duration: 25, category: 'beard', description: 'خدمة إضافية' },
    { id: 's3', name: 'علاج بشرة', price: 1200, duration: 40, category: 'facial' },
  ],
  priceRange: '300-1200',
  workingHours: {},
  isMobile: false,
  usesScissors: true,
  yearsOfExperience: 5,
  bio: '',
  portfolio: [],
  hasIdCard: true,
  idCardVerified: true,
  isSubscribed: true,
  subscriptionPlan: 'pro',
  followers: 0,
  following: 0,
  likes: 0,
} as Barber;

describe('barber extras mapping', () => {
  it('maps only extras / VIP / care services, not plain haircuts', () => {
    const extras = mapBarberExtrasToMarketplace([barber]);
    expect(extras.some(p => p.title.includes('قص كلاسيكي'))).toBe(false);
    expect(extras.some(p => p.kind === 'service_extra')).toBe(true);
    expect(extras.every(p => p.kind === 'service_extra')).toBe(true);
    expect(extras.every(p => p.sellerType === 'barber')).toBe(true);
    expect(extras.length).toBeGreaterThanOrEqual(2);
  });
});
