/** Canonical auth redirect — avoid stale traps while allowing current preview testing. */

import { absoluteUrl, getSiteUrl } from '@/lib/siteUrl';
import type { ScreenName, TabName } from '@/types';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isVercelPreviewHost(hostname: string): boolean {
  return hostname.endsWith('.vercel.app');
}

/** Post-OAuth / post-login screens that may be restored from sessionStorage. */
const SAFE_AUTH_REDIRECT_SCREENS = new Set<ScreenName>([
  'home',
  'barber-detail',
  'booking-flow',
  'post-detail',
  'messages',
  'notifications',
  'ai-advisor',
  'ai-hub-tool',
  'ai-listing-tools',
  'store-detail',
  'product-detail',
  'seller-dashboard',
  'marketplace-analytics',
  'payment-success',
]);

const SAFE_AUTH_REDIRECT_TABS = new Set<TabName>([
  'booking',
  'forum',
  'ai-hub',
  'marketplace',
  'profile',
  'appointments',
  'camera',
]);

export function isSafeAuthRedirectScreen(screen: unknown): screen is ScreenName {
  return typeof screen === 'string' && SAFE_AUTH_REDIRECT_SCREENS.has(screen as ScreenName);
}

export function isSafeAuthRedirectTab(tab: unknown): tab is TabName {
  return typeof tab === 'string' && SAFE_AUTH_REDIRECT_TABS.has(tab as TabName);
}

export function sanitizeAuthRedirectIntent(raw: unknown): {
  screen?: ScreenName;
  params?: Record<string, unknown>;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const intent = raw as { screen?: unknown; params?: unknown };
  const screen = isSafeAuthRedirectScreen(intent.screen) ? intent.screen : undefined;
  const params =
    intent.params && typeof intent.params === 'object' && !Array.isArray(intent.params)
      ? { ...(intent.params as Record<string, unknown>) }
      : undefined;
  if (params && !isSafeAuthRedirectTab(params.redirectTab)) {
    delete params.redirectTab;
  }
  if (params?.redirectScreen && !isSafeAuthRedirectScreen(params.redirectScreen)) {
    delete params.redirectScreen;
  }
  if (!screen && !params) return null;
  return { screen, params };
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
