export type AnalyticsConsent = 'accepted' | 'declined' | null;

const STORAGE_KEY = 'hallaqi-analytics-consent';

export function readAnalyticsConsent(): AnalyticsConsent {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'declined') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeAnalyticsConsent(value: 'accepted' | 'declined') {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}
