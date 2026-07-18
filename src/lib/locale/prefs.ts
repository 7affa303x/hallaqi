import type { SupportedLanguage } from '@/lib/i18n';
import type { CurrencyCode } from '@/lib/locale/currencies';

const STORAGE_KEY = 'hallaqi-locale-prefs-v1';

export interface LocalePrefs {
  language?: SupportedLanguage;
  countryCode?: string;
  currencyCode?: CurrencyCode | string;
}

export function readLocalePrefs(): LocalePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LocalePrefs;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeLocalePrefs(prefs: LocalePrefs): void {
  try {
    const current = readLocalePrefs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // ignore quota / private mode
  }
}
