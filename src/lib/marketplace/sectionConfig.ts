import type { MarketplaceSectionConfig } from '@/types/marketplace';

const KEY = 'hallaqi-marketplace-section-config';

export const DEFAULT_MARKETPLACE_SECTIONS: MarketplaceSectionConfig = {
  showProductOfTheDay: true,
  showFeaturedStrip: true,
  showBanners: true,
  showBarberExtras: true,
  showCompanies: true,
  showDoctors: true,
  categoryOrder: [],
};

export function readMarketplaceSectionConfig(): MarketplaceSectionConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_MARKETPLACE_SECTIONS };
    return { ...DEFAULT_MARKETPLACE_SECTIONS, ...JSON.parse(raw) as Partial<MarketplaceSectionConfig> };
  } catch {
    return { ...DEFAULT_MARKETPLACE_SECTIONS };
  }
}

export function writeMarketplaceSectionConfig(config: MarketplaceSectionConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // ignore quota
  }
}

const REPORTS_KEY = 'hallaqi-marketplace-reports';

export interface MarketplaceReport {
  id: string;
  targetType: 'product' | 'seller';
  targetId: string;
  targetLabel: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export function listMarketplaceReports(): MarketplaceReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? JSON.parse(raw) as MarketplaceReport[] : [];
  } catch {
    return [];
  }
}

export function createMarketplaceReport(input: Omit<MarketplaceReport, 'id' | 'status' | 'createdAt'>): MarketplaceReport {
  const report: MarketplaceReport = {
    ...input,
    id: `mkt-report-${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const all = [report, ...listMarketplaceReports()];
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(all.slice(0, 200)));
  } catch { /* ignore */ }
  return report;
}

export function resolveMarketplaceReport(id: string, resolve: boolean): void {
  const all = listMarketplaceReports().map(r =>
    r.id === id ? { ...r, status: (resolve ? 'resolved' : 'dismissed') as MarketplaceReport['status'] } : r
  );
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
