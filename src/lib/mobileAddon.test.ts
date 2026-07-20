import { describe, expect, it } from 'vitest';
import { barberOffersMobile, findMobileAddonService } from '@/lib/mobileAddon';
import type { Barber } from '@/types';
import { findBlockedContent } from '@/lib/contentFilter';

const baseBarber = {
  id: 'b1',
  name: 'Test',
  avatar: '',
  coverImage: '',
  rating: 5,
  reviewCount: 1,
  location: '',
  wilaya: '',
  distance: '',
  isActive: true,
  isVerified: true,
  tags: [] as Barber['tags'],
  services: [],
  priceRange: '',
  workingHours: {},
  isMobile: false,
  usesScissors: true,
  yearsOfExperience: 1,
  bio: '',
  portfolio: [],
  hasIdCard: false,
  idCardVerified: false,
  isSubscribed: false,
  followers: 0,
  following: 0,
  likes: 0,
} as Barber;

describe('mobileAddon', () => {
  it('finds cheapest mobile-named service', () => {
    const barber: Barber = {
      ...baseBarber,
      isMobile: true,
      services: [
        { id: 'a', name: 'عناية منزلية كاملة', price: 1200, duration: 60, category: 'package' },
        { id: 'b', name: 'رسوم التنقل', price: 200, duration: 15, category: 'package' },
      ],
    };
    expect(findMobileAddonService(barber)?.id).toBe('b');
    expect(barberOffersMobile(barber)).toBe(true);
  });

  it('returns false when not mobile and no matching service', () => {
    const barber: Barber = {
      ...baseBarber,
      services: [{ id: 'a', name: 'قص كلاسيكي', price: 300, duration: 30, category: 'haircut' }],
    };
    expect(findMobileAddonService(barber)).toBeUndefined();
    expect(barberOffersMobile(barber)).toBe(false);
  });
});

describe('contentFilter', () => {
  it('blocks obvious abuse', () => {
    expect(findBlockedContent('هذا fuck محتوى')).toBeTruthy();
    expect(findBlockedContent('مرحبا بالجميع')).toBeNull();
  });
});
