/** Display currencies: Arab world + USD + EUR (France / Eurozone). */

export type CurrencyCode =
  | 'DZD' | 'MAD' | 'TND' | 'EGP' | 'LYD' | 'MRU' | 'SDG' | 'SOS' | 'DJF' | 'KMF'
  | 'SAR' | 'AED' | 'QAR' | 'KWD' | 'BHD' | 'OMR' | 'JOD' | 'LBP' | 'IQD' | 'SYP' | 'YER'
  | 'USD' | 'EUR';

export interface CurrencyOption {
  code: CurrencyCode;
  /** Approx DZD per 1 unit of this currency (display conversion only). */
  dzdPerUnit: number;
  symbolAr: string;
  symbolFr: string;
  symbolEn: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
}

/**
 * Soft-launch display rates (indicative, not for settlement).
 * Booking amounts remain stored/settled in DZD cash.
 */
export const DISPLAY_CURRENCIES: CurrencyOption[] = [
  { code: 'DZD', dzdPerUnit: 1, symbolAr: 'دج', symbolFr: 'DA', symbolEn: 'DZD', nameAr: 'دينار جزائري', nameFr: 'Dinar algérien', nameEn: 'Algerian dinar' },
  { code: 'MAD', dzdPerUnit: 13.5, symbolAr: 'درهم', symbolFr: 'MAD', symbolEn: 'MAD', nameAr: 'درهم مغربي', nameFr: 'Dirham marocain', nameEn: 'Moroccan dirham' },
  { code: 'TND', dzdPerUnit: 43, symbolAr: 'د.ت', symbolFr: 'TND', symbolEn: 'TND', nameAr: 'دينار تونسي', nameFr: 'Dinar tunisien', nameEn: 'Tunisian dinar' },
  { code: 'EGP', dzdPerUnit: 2.7, symbolAr: 'ج.م', symbolFr: 'EGP', symbolEn: 'EGP', nameAr: 'جنيه مصري', nameFr: 'Livre égyptienne', nameEn: 'Egyptian pound' },
  { code: 'LYD', dzdPerUnit: 28, symbolAr: 'د.ل', symbolFr: 'LYD', symbolEn: 'LYD', nameAr: 'دينار ليبي', nameFr: 'Dinar libyen', nameEn: 'Libyan dinar' },
  { code: 'MRU', dzdPerUnit: 3.4, symbolAr: 'أوقية', symbolFr: 'MRU', symbolEn: 'MRU', nameAr: 'أوقية موريتانية', nameFr: 'Ouguiya', nameEn: 'Mauritanian ouguiya' },
  { code: 'SDG', dzdPerUnit: 0.22, symbolAr: 'ج.س', symbolFr: 'SDG', symbolEn: 'SDG', nameAr: 'جنيه سوداني', nameFr: 'Livre soudanaise', nameEn: 'Sudanese pound' },
  { code: 'SOS', dzdPerUnit: 0.23, symbolAr: 'ش.ص', symbolFr: 'SOS', symbolEn: 'SOS', nameAr: 'شلن صومالي', nameFr: 'Shilling somalien', nameEn: 'Somali shilling' },
  { code: 'DJF', dzdPerUnit: 0.75, symbolAr: 'ف.ج', symbolFr: 'DJF', symbolEn: 'DJF', nameAr: 'فرنك جيبوتي', nameFr: 'Franc djiboutien', nameEn: 'Djiboutian franc' },
  { code: 'KMF', dzdPerUnit: 0.29, symbolAr: 'ف.ق', symbolFr: 'KMF', symbolEn: 'KMF', nameAr: 'فرنك قمري', nameFr: 'Franc comorien', nameEn: 'Comorian franc' },
  { code: 'SAR', dzdPerUnit: 35.5, symbolAr: 'ر.س', symbolFr: 'SAR', symbolEn: 'SAR', nameAr: 'ريال سعودي', nameFr: 'Riyal saoudien', nameEn: 'Saudi riyal' },
  { code: 'AED', dzdPerUnit: 36.3, symbolAr: 'د.إ', symbolFr: 'AED', symbolEn: 'AED', nameAr: 'درهم إماراتي', nameFr: 'Dirham émirati', nameEn: 'UAE dirham' },
  { code: 'QAR', dzdPerUnit: 36.6, symbolAr: 'ر.ق', symbolFr: 'QAR', symbolEn: 'QAR', nameAr: 'ريال قطري', nameFr: 'Riyal qatari', nameEn: 'Qatari riyal' },
  { code: 'KWD', dzdPerUnit: 435, symbolAr: 'د.ك', symbolFr: 'KWD', symbolEn: 'KWD', nameAr: 'دينار كويتي', nameFr: 'Dinar koweïtien', nameEn: 'Kuwaiti dinar' },
  { code: 'BHD', dzdPerUnit: 353, symbolAr: 'د.ب', symbolFr: 'BHD', symbolEn: 'BHD', nameAr: 'دينار بحريني', nameFr: 'Dinar bahreïni', nameEn: 'Bahraini dinar' },
  { code: 'OMR', dzdPerUnit: 346, symbolAr: 'ر.ع', symbolFr: 'OMR', symbolEn: 'OMR', nameAr: 'ريال عُماني', nameFr: 'Rial omanais', nameEn: 'Omani rial' },
  { code: 'JOD', dzdPerUnit: 188, symbolAr: 'د.أ', symbolFr: 'JOD', symbolEn: 'JOD', nameAr: 'دينار أردني', nameFr: 'Dinar jordanien', nameEn: 'Jordanian dinar' },
  { code: 'LBP', dzdPerUnit: 0.0015, symbolAr: 'ل.ل', symbolFr: 'LBP', symbolEn: 'LBP', nameAr: 'ليرة لبنانية', nameFr: 'Livre libanaise', nameEn: 'Lebanese pound' },
  { code: 'IQD', dzdPerUnit: 0.1, symbolAr: 'د.ع', symbolFr: 'IQD', symbolEn: 'IQD', nameAr: 'دينار عراقي', nameFr: 'Dinar irakien', nameEn: 'Iraqi dinar' },
  { code: 'SYP', dzdPerUnit: 0.01, symbolAr: 'ل.س', symbolFr: 'SYP', symbolEn: 'SYP', nameAr: 'ليرة سورية', nameFr: 'Livre syrienne', nameEn: 'Syrian pound' },
  { code: 'YER', dzdPerUnit: 0.53, symbolAr: 'ر.ي', symbolFr: 'YER', symbolEn: 'YER', nameAr: 'ريال يمني', nameFr: 'Rial yéménite', nameEn: 'Yemeni rial' },
  { code: 'USD', dzdPerUnit: 134, symbolAr: '$', symbolFr: '$', symbolEn: 'USD', nameAr: 'دولار أمريكي', nameFr: 'Dollar américain', nameEn: 'US dollar' },
  { code: 'EUR', dzdPerUnit: 145, symbolAr: '€', symbolFr: '€', symbolEn: 'EUR', nameAr: 'يورو (فرنسا / منطقة اليورو)', nameFr: 'Euro (France / zone euro)', nameEn: 'Euro (France / Eurozone)' },
];

export function findCurrency(code?: string | null): CurrencyOption {
  const found = DISPLAY_CURRENCIES.find(c => c.code === (code || '').toUpperCase());
  return found || DISPLAY_CURRENCIES[0];
}

export function currencyLabel(currency: CurrencyOption, language: 'ar' | 'fr' | 'en'): string {
  if (language === 'fr') return currency.nameFr;
  if (language === 'en') return currency.nameEn;
  return currency.nameAr;
}

export function currencySymbol(currency: CurrencyOption, language: 'ar' | 'fr' | 'en'): string {
  if (language === 'fr') return currency.symbolFr;
  if (language === 'en') return currency.symbolEn;
  return currency.symbolAr;
}

/** Convert a DZD amount to the display currency (indicative). */
export function convertFromDzd(amountDzd: number, currencyCode: CurrencyCode | string): number {
  const currency = findCurrency(currencyCode);
  if (currency.dzdPerUnit <= 0) return amountDzd;
  return amountDzd / currency.dzdPerUnit;
}

export function formatMoney(
  amountDzd: number,
  options: {
    currencyCode?: string;
    language?: 'ar' | 'fr' | 'en';
    maximumFractionDigits?: number;
  } = {},
): string {
  const language = options.language || 'ar';
  const currency = findCurrency(options.currencyCode || 'DZD');
  const value = convertFromDzd(amountDzd, currency.code);
  const digits = options.maximumFractionDigits
    ?? (currency.code === 'DZD' || currency.code === 'IQD' || currency.code === 'LBP' || currency.code === 'SYP' || currency.code === 'YER' || currency.code === 'SOS' || currency.code === 'SDG' || currency.code === 'DJF' || currency.code === 'KMF' ? 0 : 2);
  const locale = language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : 'ar-DZ';
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(2, digits) : 0,
  }).format(Number.isFinite(value) ? value : 0);
  return `${formatted} ${currencySymbol(currency, language)}`;
}
