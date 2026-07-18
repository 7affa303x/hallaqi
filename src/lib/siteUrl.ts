/** Canonical public site URL — prefer custom domain for SEO. */

const DEFAULT_SITE_URL = 'https://hallaqi.app';

export function getSiteUrl(): string {
  const fromEnv = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || '';
  const raw = (fromEnv || DEFAULT_SITE_URL).replace(/\/$/, '');
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl();
  if (!path || path === '/') return `${base}/`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const SITE_BRAND = {
  nameAr: 'حلاقي',
  nameEn: 'Hallaqi',
  supportEmail: 'support@hallaqi.app',
  defaultDomain: 'hallaqi.app',
} as const;
