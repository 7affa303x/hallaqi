/** Server-safe site URL (API routes). Prefer custom domain for SEO. */

const DEFAULT_SITE_URL = 'https://hallaqi.app';

export function getSiteUrl(): string {
  const raw = (process.env.VITE_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL)
    .trim()
    .replace(/\/$/, '');
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
