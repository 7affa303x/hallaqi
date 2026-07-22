import type { BadgeAudience, BadgeDef } from '@/lib/progression/models/types';
import { BADGE_CATALOG } from '@/lib/progression/config/badges';

function normalizeRole(role?: string | null): BadgeAudience | 'specialist' {
  const r = (role || 'client').toLowerCase();
  if (r === 'specialist') return 'specialist';
  if (r === 'barber' || r === 'store' || r === 'doctor' || r === 'client') return r;
  return 'client';
}

export function badgeCatalogForRole(role?: string | null): readonly BadgeDef[] {
  const normalized = normalizeRole(role);
  return BADGE_CATALOG.filter((badge) => {
    if (!badge.audience || badge.audience.length === 0) {
      return normalized === 'client' || normalized === 'barber' || normalized === 'specialist';
    }
    if (normalized === 'specialist') return badge.audience.includes('barber');
    if (normalized === 'client' || normalized === 'barber' || normalized === 'store' || normalized === 'doctor') {
      return badge.audience.includes(normalized);
    }
    return false;
  });
}
