import { describe, expect, it } from 'vitest';
import { isDisplayableBarber, isPlausibleService } from '@/lib/utils';
import type { Barber } from '@/types';

const base = (overrides: Partial<Barber> = {}): Barber => ({
  id: '1',
  name: 'عمر الحلاق',
  avatar: '',
  coverImage: '',
  rating: 4.5,
  reviewCount: 1,
  location: 'باب الزوار',
  wilaya: 'الجزائر العاصمة',
  distance: '—',
  isActive: true,
  isVerified: true,
  tags: ['verified'],
  services: [{ id: 's1', name: 'قص شعر', price: 300, duration: 30, category: 'haircut' }],
  priceRange: '300 دج',
  workingHours: {},
  isMobile: false,
  usesScissors: true,
  yearsOfExperience: 5,
  bio: 'bio',
  portfolio: [],
  hasIdCard: true,
  idCardVerified: true,
  isSubscribed: false,
  followers: 0,
  following: 0,
  likes: 0,
  ...overrides,
});

describe('isPlausibleService', () => {
  it('rejects junk prices and durations', () => {
    expect(isPlausibleService({ name: 'test', price: 5555, duration: 305 })).toBe(false);
    expect(isPlausibleService({ name: 'قص', price: 300, duration: 30 })).toBe(true);
    expect(isPlausibleService({ name: '', price: 300, duration: 30 })).toBe(false);
  });
});

describe('isDisplayableBarber', () => {
  it('hides incomplete / placeholder barbers', () => {
    expect(isDisplayableBarber(base())).toBe(true);
    expect(isDisplayableBarber(base({ services: [] }))).toBe(false);
    expect(isDisplayableBarber(base({
      name: 'حلاق',
      wilaya: 'ولاية غير محددة',
      location: 'عنوان غير محدد',
    }))).toBe(false);
  });
});
