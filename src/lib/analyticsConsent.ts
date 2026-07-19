/** Analytics / performance consent — durable across soft reloads. */

export type AnalyticsConsent = 'accepted' | 'declined' | null;

const STORAGE_KEY = 'hallaqi-analytics-consent';
const COOKIE_KEY = 'hallaqi_analytics_consent';

function readCookie(): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function writeCookie(value: 'accepted' | 'declined') {
  try {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function readAnalyticsConsent(): AnalyticsConsent {
  try {
    const fromLs = localStorage.getItem(STORAGE_KEY);
    if (fromLs === 'accepted' || fromLs === 'declined') return fromLs;
  } catch {
    /* ignore */
  }
  try {
    const fromSs = sessionStorage.getItem(STORAGE_KEY);
    if (fromSs === 'accepted' || fromSs === 'declined') return fromSs;
  } catch {
    /* ignore */
  }
  const fromCookie = readCookie();
  if (fromCookie === 'accepted' || fromCookie === 'declined') {
    // Rehydrate storage so later reads are fast
    try { localStorage.setItem(STORAGE_KEY, fromCookie); } catch { /* ignore */ }
    return fromCookie;
  }
  return null;
}

export function writeAnalyticsConsent(value: 'accepted' | 'declined') {
  try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
  try { sessionStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
  writeCookie(value);
}

/** True when the user already chose — never show the banner again. */
export function hasAnalyticsDecision(): boolean {
  return readAnalyticsConsent() !== null;
}
