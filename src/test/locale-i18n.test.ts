import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n';
import { convertFromDzd, findCurrency, formatMoney } from '@/lib/locale/currencies';
import { WORLD_COUNTRIES, findCountry, countryLabel } from '@/lib/locale/countries';

describe('i18n packs', () => {
  it('returns fr and en without falling back incorrectly', () => {
    expect(translate('fr', 'booking')).toBe('Réserver');
    expect(translate('en', 'booking')).toBe('Book');
    expect(translate('ar', 'cashOnVisit')).toContain('نقداً');
    expect(translate('fr', 'cashOnVisit')).toContain('espèces');
  });
});

describe('countries', () => {
  it('includes Algeria and has world coverage', () => {
    expect(WORLD_COUNTRIES.length).toBeGreaterThan(180);
    expect(findCountry('DZ')?.nameEn).toMatch(/Algeria/i);
    expect(countryLabel(findCountry('FR')!, 'fr')).toMatch(/France/i);
  });
});

describe('currencies', () => {
  it('converts DZD to USD/EUR for display', () => {
    expect(findCurrency('EUR').code).toBe('EUR');
    expect(findCurrency('USD').code).toBe('USD');
    expect(convertFromDzd(1340, 'USD')).toBeCloseTo(10, 0);
    expect(formatMoney(300, { currencyCode: 'DZD', language: 'ar' })).toContain('دج');
    expect(formatMoney(1450, { currencyCode: 'EUR', language: 'fr' })).toContain('€');
  });
});
