/** Canonical auth redirect — avoid stale traps while allowing current preview testing. */

import { absoluteUrl, getSiteUrl } from '@/lib/siteUrl';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isVercelPreviewHost(hostname: string): boolean {
  return hostname.endsWith('.vercel.app');
}

/**
 * OAuth / magic-link / password-reset redirect target.
 * - localhost → current origin
 * - *.vercel.app → current preview origin (so a fresh deploy can be tested end-to-end)
 * - otherwise → canonical https://hallaqi.app
 */
export function getAuthRedirectUrl(path = '/'): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (isLocalHost(host) || isVercelPreviewHost(host)) {
      return `${window.location.origin}${normalized === '/' ? '/' : normalized}`;
    }
  }
  return absoluteUrl(path);
}

export function getCanonicalOrigin(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (isLocalHost(host) || isVercelPreviewHost(host)) return window.location.origin;
  }
  return getSiteUrl();
}

/** Strip Supabase/OAuth error query params and return a user-facing message if any. */
export function consumeAuthUrlError(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const err = url.searchParams.get('error');
    const desc = url.searchParams.get('error_description') || url.searchParams.get('error_code');
    if (!err && !desc) return null;

    url.searchParams.delete('error');
    url.searchParams.delete('error_code');
    url.searchParams.delete('error_description');
    url.searchParams.delete('state');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);

    if (err === 'server_error' || desc?.includes('server_error')) {
      return 'تعذر إكمال تسجيل الدخول من المزوّد. حاول مرة أخرى أو سجّل بالبريد.';
    }
    if (err === 'access_denied') {
      return 'تم إلغاء تسجيل الدخول.';
    }
    return desc ? decodeURIComponent(desc.replace(/\+/g, ' ')) : 'فشل تسجيل الدخول.';
  } catch {
    return null;
  }
}
