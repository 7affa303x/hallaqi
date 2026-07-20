import type { Barber, Service } from '@/types';

const MOBILE_SERVICE_RE = /متنقل|منزلي|تنقل|زيارة|موبايل|mobile|home\s*visit|travel/i;

/**
 * Extra fee service for mobile/home visits — barber-defined service matching
 * mobile/home keywords. Used as an add-on on the final booking step.
 */
export function findMobileAddonService(barber: Barber): Service | undefined {
  const matches = barber.services.filter(s => MOBILE_SERVICE_RE.test(s.name) || MOBILE_SERVICE_RE.test(s.description || ''));
  if (matches.length === 0) return undefined;
  // Prefer the cheapest dedicated travel/mobile fee over full home packages
  return [...matches].sort((a, b) => a.price - b.price)[0];
}

export function barberOffersMobile(barber: Barber): boolean {
  return Boolean(
    barber.isMobile
    || barber.tags.includes('mobile')
    || barber.tags.includes('home-service')
    || findMobileAddonService(barber),
  );
}
