import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import type { Barber, WorkingHours, BarberTag, Service, ServiceCategory } from '@/types';
import { mapReviewRow } from '@/lib/mappers';

type SubscriptionPlan = NonNullable<Barber['subscriptionPlan']>;

interface RawService {
  id?: string | null;
  name?: string | null;
  price?: number | null;
  duration_minutes?: number | null;
  duration?: number | null;
  description?: string | null;
  category?: string | string[] | null;
  image?: string | null;
}

type RawPortfolioItem = string | { url?: string | null };

interface RawAvailabilitySchedule {
  day_of_week?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean | null;
}

interface RawProfile {
  full_name?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  phone_number?: string | null;
  verification_status?: string | null;
}

/** Loosely-typed professional row joined with related profile/services/portfolio data. */
export interface RawProfessional {
  id: string;
  business_name?: string | null;
  cover_image_url?: string | null;
  average_rating?: number | null;
  review_count?: number | null;
  business_address?: string | null;
  business_phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean | null;
  verification_status?: string | null;
  is_mobile?: boolean | null;
  uses_scissors?: boolean | null;
  years_of_experience?: number | null;
  bio?: string | null;
  has_id_card?: boolean | null;
  id_card_verified?: boolean | null;
  is_subscribed?: boolean | null;
  subscription_plan?: string | null;
  followers_count?: number | null;
  following_count?: number | null;
  likes_count?: number | null;
  profiles?: RawProfile | RawProfile[] | null;
  services?: RawService[] | null;
  portfolio_items?: RawPortfolioItem[] | null;
  availability_schedules?: RawAvailabilitySchedule[] | null;
  reviews?: unknown[] | null;
}

export function transformToBarber(professional: RawProfessional): Barber {
  const profile = (Array.isArray(professional.profiles) ? professional.profiles[0] : professional.profiles) ?? undefined;
  const rawServices = professional.services || [];
  const portfolio = professional.portfolio_items || [];

  // Map raw DB services to app Service type — drop junk/test rows that destroy trust
  const services: Service[] = rawServices
    .map((s: RawService) => ({
      id: s.id || '',
      name: (s.name || '').trim(),
      price: Number(s.price) || 0,
      duration: Number(s.duration_minutes || s.duration || 30),
      description: s.description || undefined,
      category: (typeof s.category === 'string' ? s.category : 'haircut') as ServiceCategory,
      image: s.image || undefined,
    }))
    .filter(service => isPlausibleService(service));

  // The database/editor uses 0=Saturday through 6=Friday.
  const dayKeys = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const defaultWorkingHours: WorkingHours = {
    sunday: { open: '09:00', close: '17:00', isOpen: true },
    monday: { open: '09:00', close: '17:00', isOpen: true },
    tuesday: { open: '09:00', close: '17:00', isOpen: true },
    wednesday: { open: '09:00', close: '17:00', isOpen: true },
    thursday: { open: '09:00', close: '17:00', isOpen: true },
    friday: { open: 'closed', close: 'closed', isOpen: false },
    saturday: { open: '09:00', close: '17:00', isOpen: true },
  };
  const workingHours = { ...defaultWorkingHours };
  for (const schedule of professional.availability_schedules || []) {
    const dayKey = typeof schedule.day_of_week === 'number' ? dayKeys[schedule.day_of_week] : undefined;
    if (!dayKey) continue;
    const isOpen = schedule.is_active === true;
    workingHours[dayKey] = {
      open: isOpen ? (schedule.start_time || '09:00').slice(0, 5) : 'closed',
      close: isOpen ? (schedule.end_time || '17:00').slice(0, 5) : 'closed',
      isOpen,
    };
  }

  // Derive tags
  const tags: BarberTag[] = [];
  if (professional.is_mobile) tags.push('mobile', 'home-service');
  if (professional.uses_scissors) tags.push('scissors-user');
  if (professional.average_rating && professional.average_rating >= 4.5) tags.push('top-rated');
  if (
    professional.verification_status === 'verified'
    || professional.verification_status === 'premium'
    || profile?.verification_status === 'verified'
    || profile?.verification_status === 'premium'
  ) {
    tags.push('verified');
  }
  if (professional.is_active) tags.push('active');
  tags.push('cash'); // soft-launch: cash at visit is the primary path
  const minDuration = Math.min(...services.map((s: Service) => s.duration).filter(Boolean), 999);
  if (minDuration > 0 && minDuration <= 30) tags.push('quick');
  if (services.some((s: Service) => s.price >= 1500)) tags.push('premium');

  // Calculate price range
  const prices = services.map((s: Service) => s.price).filter((p: number) => p !== undefined && p > 0);
  let priceRange = '—';
  if (prices.length > 0) {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) {
      priceRange = `${minPrice} دج`;
    } else {
      priceRange = `${minPrice} – ${maxPrice} دج`;
    }
  }

  const cityRaw = profile?.city?.trim() || '';
  const addressRaw = professional.business_address?.trim() || '';
  const city = isMissingLocation(cityRaw) ? '' : cityRaw;
  const address = isMissingLocation(addressRaw) ? '' : addressRaw;

  return {
    id: professional.id,
    name: professional.business_name?.trim() || profile?.full_name?.trim() || 'حلاق',
    avatar: profile?.avatar_url || '/logo-icon.png',
    coverImage: professional.cover_image_url || '/logo-wordmark.png',
    rating: professional.average_rating || 0,
    reviewCount: professional.review_count || 0,
    location: address || city || 'عنوان غير محدد',
    wilaya: city || 'ولاية غير محددة',
    distance: '—',
    coordinates: professional.latitude && professional.longitude ? { lat: professional.latitude, lng: professional.longitude } : undefined,
    isActive: professional.is_active || false,
    isVerified: professional.verification_status === 'verified' || professional.verification_status === 'premium' || profile?.verification_status === 'verified' || profile?.verification_status === 'premium',
    tags: tags.length > 0 ? tags : ['new'],
    services,
    priceRange,
    workingHours,
    isMobile: professional.is_mobile || false,
    usesScissors: professional.uses_scissors || false,
    yearsOfExperience: professional.years_of_experience || 0,
    bio: professional.bio?.trim() || 'لا توجد نبذة بعد — تواصل مع الحلاق للتفاصيل.',
    portfolio: portfolio.map((item: RawPortfolioItem) => (typeof item === 'string' ? item : item.url || '')).filter(Boolean),
    phone: professional.business_phone || undefined,
    hasIdCard: professional.has_id_card || false,
    idCardVerified: professional.id_card_verified || false,
    isSubscribed: professional.is_subscribed || false,
    subscriptionPlan: (professional.subscription_plan as SubscriptionPlan | null) || undefined,
    followers: professional.followers_count || 0,
    following: professional.following_count || 0,
    likes: professional.likes_count || 0,
    isFollowing: false,
    reviews: (professional.reviews || []).map(mapReviewRow),
  };
}

/** Drop obvious test/junk services that erode trust in the Algeria soft launch. */
export function isPlausibleService(service: Pick<Service, 'name' | 'price' | 'duration'>): boolean {
  const name = (service.name || '').trim().toLowerCase();
  if (!name || name.length < 2) return false;
  if (
    name === 'n/a'
    || name === 'test'
    || name === 'asdf'
    || name.includes('unknown')
    || name.includes('تجريب')
  ) {
    return false;
  }
  // Soft-launch Algeria: real salon prices cluster well below 15k DZD.
  if (service.price <= 0 || service.price > 15000) return false;
  // Repeated digit test prices (5555, 1111, 9999…) are almost never real menus.
  if (/^(\d)\1{2,}$/.test(String(Math.trunc(service.price)))) return false;
  if (service.duration < 5 || service.duration > 240) return false;
  return true;
}

/** Prefer listing barbers that look real enough for a soft launch. */
export function isMissingLocation(value: string | undefined | null): boolean {
  const v = (value || '').trim().toLowerCase();
  if (!v) return true;
  // Match exact junk AND composite strings like "Unknown Location, Unknown Wilaya".
  return (
    v === 'n/a'
    || v === 'na'
    || v === 'null'
    || v === 'undefined'
    || v === '—'
    || v === '-'
    || v.includes('unknown')
    || v.includes('n/a')
    || v.includes('غير محدد')
    || v.includes('غير معر')
    || v.includes('موقع غير')
  );
}

export function formatBarberLocation(barber: Pick<Barber, 'location' | 'wilaya'>): string {
  const loc = isMissingLocation(barber.location) ? '' : barber.location.trim();
  const wilaya = isMissingLocation(barber.wilaya) ? '' : barber.wilaya.trim();
  if (loc && wilaya && loc !== wilaya) return `${loc}، ${wilaya}`;
  return loc || wilaya || 'الموقع غير مكتمل';
}

export function isDisplayableBarber(barber: Barber): boolean {
  if (!barber.isActive) return false;
  if (!barber.services.length) return false;
  const name = (barber.name || '').trim();
  if (!name || name === 'حلاق' || name.toLowerCase() === 'unknown' || name.toLowerCase() === 'n/a') {
    return false;
  }
  // Hide junk / incomplete profiles that erode trust (Unknown / N/A / empty city).
  // Require at least one real location field — both missing OR both junk → hide.
  if (isMissingLocation(barber.wilaya) && isMissingLocation(barber.location)) return false;
  if (!barber.services.some(isPlausibleService)) return false;
  return true;
}

const ALGIERS_TZ = 'Africa/Algiers';

function parseTimeToMinutes(value: string): number | null {
  if (!value || value === 'closed') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getAlgiersClock(now: Date): { dayKey: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ALGIERS_TZ,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const weekday = (parts.find(part => part.type === 'weekday')?.value || 'Sunday').toLowerCase();
  let hour = Number(parts.find(part => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find(part => part.type === 'minute')?.value ?? 0);
  if (hour === 24) hour = 0;
  return { dayKey: weekday, minutes: hour * 60 + minute };
}

/** Whether a barber is open right now in Africa/Algiers local time. */
export function isBarberOpenNow(workingHours: WorkingHours, now: Date = new Date()): boolean {
  if (!workingHours) return false;
  const { dayKey, minutes } = getAlgiersClock(now);
  const today = workingHours[dayKey];
  if (!today || today.isOpen === false) return false;

  const openMinutes = parseTimeToMinutes(today.open);
  const closeMinutes = parseTimeToMinutes(today.close);
  if (openMinutes == null || closeMinutes == null) return false;

  if (closeMinutes > openMinutes) {
    return minutes >= openMinutes && minutes < closeMinutes;
  }
  if (closeMinutes < openMinutes) {
    return minutes >= openMinutes || minutes < closeMinutes;
  }
  return false;
}
