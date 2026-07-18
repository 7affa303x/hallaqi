import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Eye, MousePointerClick, Bookmark, UserRoundSearch, Search, Crown, TrendingUp, MapPin, Lock } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { summarizeMarketplaceAnalytics } from '@/lib/marketplace/analytics';
import { analyticsUnlockMessage, canAccessAnalyticsLevel, getPlanById } from '@/lib/marketplace/planAccess';
import { getMarketplaceSellerById } from '@/supabase/marketplace';
import type { MarketplaceAnalyticsSummary, MarketplacePlanTier } from '@/types/marketplace';

export default function MarketplaceAnalyticsPage() {
  const { themeConfig, goBack, screenParams } = useApp();
  const sellerId = screenParams?.sellerId;
  const [summary, setSummary] = useState<MarketplaceAnalyticsSummary | null>(null);
  const [planId, setPlanId] = useState<MarketplacePlanTier>('free');

  useEffect(() => {
    setSummary(summarizeMarketplaceAnalytics(sellerId));
    if (sellerId) {
      void getMarketplaceSellerById(sellerId).then(s => {
        if (s?.subscriptionPlan) setPlanId(s.subscriptionPlan);
      });
    } else if (screenParams?.plan) {
      setPlanId(screenParams.plan as MarketplacePlanTier);
    }
  }, [sellerId, screenParams?.plan]);

  const plan = getPlanById(planId);
  const showAdvanced = canAccessAnalyticsLevel(planId, 'advanced');
  const showFull = canAccessAnalyticsLevel(planId, 'full');
  const showStandard = canAccessAnalyticsLevel(planId, 'standard');

  const cards = useMemo(() => {
    if (!summary) return [];
    const all = [
      { label: 'المشاهدات', value: summary.views, icon: Eye, min: 'basic' as const },
      { label: 'النقرات', value: summary.clicks, icon: MousePointerClick, min: 'basic' as const },
      { label: 'الحفظ', value: summary.saves, icon: Bookmark, min: 'standard' as const },
      { label: 'زيارات الملف', value: summary.profileVisits, icon: UserRoundSearch, min: 'standard' as const },
      { label: 'ظهور البحث', value: summary.searchImpressions, icon: Search, min: 'standard' as const },
      { label: 'ظهور مميز', value: summary.featuredImpressions, icon: Crown, min: 'advanced' as const },
      { label: 'نقرات مميزة', value: summary.featuredClicks, icon: Crown, min: 'advanced' as const },
      { label: 'زيارة المتجر', value: summary.visitStoreClicks, icon: MousePointerClick, min: 'advanced' as const },
      { label: 'تحويل %', value: summary.conversionRatePct, icon: TrendingUp, min: 'full' as const, suffix: '%' },
      { label: 'مشاهدات منتج اليوم', value: summary.productOfDayViews, icon: TrendingUp, min: 'full' as const },
      { label: 'نقرات منتج اليوم', value: summary.productOfDayClicks, icon: TrendingUp, min: 'full' as const },
    ];
    return all.filter(c => canAccessAnalyticsLevel(planId, c.min));
  }, [summary, planId]);

  return (
    <div className="min-h-screen pb-24 px-4 pt-4" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }} aria-label="رجوع">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-base font-black flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
            <BarChart3 size={16} /> تحليلات السوق
          </h1>
          <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
            الخطة: {plan.nameAr} · {analyticsUnlockMessage(planId)}
          </p>
        </div>
      </div>

      {!showStandard && (
        <div className="rounded-2xl border p-3 mb-4 flex items-start gap-2" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <Lock size={14} style={{ color: themeConfig.colors.accent }} />
          <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>
            المستويات الأعلى تفتح رؤى وأدوات — ليس فقط كمية القوائم. رقِّ إلى أساسي+ للمزيد.
          </p>
        </div>
      )}

      {summary && (
        <>
          <div className="rounded-2xl border p-4 mb-4 flex items-center justify-between"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
            <div>
              <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>النمو</p>
              <p className="text-2xl font-black" style={{ color: themeConfig.colors.primary }}>+{summary.growthPct}%</p>
            </div>
            <TrendingUp size={28} style={{ color: themeConfig.colors.accent }} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {cards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border p-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: themeConfig.colors.textMuted }}>
                    <Icon size={13} />
                    <span className="text-[10px] font-bold">{card.label}</span>
                  </div>
                  <p className="text-lg font-black" style={{ color: themeConfig.colors.text }}>
                    {card.value.toLocaleString('ar-DZ')}{card.suffix || ''}
                  </p>
                </div>
              );
            })}
          </div>

          {showAdvanced && (
            <>
              <h2 className="text-sm font-black mt-5 mb-2" style={{ color: themeConfig.colors.text }}>أفضل الفئات</h2>
              <div className="space-y-2">
                {summary.topCategories.map(cat => (
                  <div key={cat.id} className="rounded-xl border px-3 py-2 flex justify-between text-xs"
                    style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
                    <span>{cat.label}</span>
                    <span className="font-bold">{cat.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {showFull && (
            <>
              <h2 className="text-sm font-black mt-5 mb-2 flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
                <MapPin size={14} /> أفضل المواقع
              </h2>
              <div className="space-y-2">
                {summary.topLocations.map(loc => (
                  <div key={loc.wilaya} className="rounded-xl border px-3 py-2 flex justify-between text-xs"
                    style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}>
                    <span>{loc.wilaya}</span>
                    <span className="font-bold">{loc.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
