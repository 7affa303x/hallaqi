import { useCallback, useMemo } from 'react';
import { useApp } from '@/contexts/useApp';
import { translate, type TranslationKey } from '@/lib/i18n';
import { formatMoney } from '@/lib/locale/currencies';

/** Convenience i18n + money formatting from app settings. */
export function useI18n() {
  const { settings } = useApp();
  const language = settings.language;
  const currencyCode = settings.currencyCode || 'DZD';

  const t = useCallback((key: TranslationKey) => translate(language, key), [language]);

  const money = useCallback((amountDzd: number) => formatMoney(amountDzd, {
    currencyCode,
    language,
  }), [currencyCode, language]);

  return useMemo(() => ({ language, currencyCode, t, money }), [language, currencyCode, t, money]);
}
