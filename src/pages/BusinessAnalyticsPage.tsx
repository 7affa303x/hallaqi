import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { getOwnerAnalyticsSummary } from '@/lib/marketplace';
import { ChevronLeft, Eye, MousePointerClick, Bookmark, UserRound, Search, Sparkles, Crown, ExternalLink } from 'lucide-react';

export default function BusinessAnalyticsPage() {
  const { themeConfig, goBack } = useApp();
  const { appUser } = useAuth();
  const role = appUser?.user_role;
  const ownerType = role === 'company' ? 'company' : 'store';
  const [stats, setStats] = useState({
    views: 0, clicks: 0, saves: 0, profile_visits: 0, search_impressions: 0,
    product_of_day: 0, featured_slot: 0, visit_store: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appUser?.id || (role !== 'store' && role !== 'company')) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getOwnerAnalyticsSummary(appUser.id, ownerType);
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل التحليلات');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appUser?.id, ownerType, role]);

  const cards = [
    { label: 'المشاهدات', value: stats.views, icon: Eye },
    { label: 'النقرات', value: stats.clicks, icon: MousePointerClick },
    { label: 'الحفظ', value: stats.saves, icon: Bookmark },
    { label: 'زيارات الصفحة', value: stats.profile_visits, icon: UserRound },
    { label: 'ظهور البحث', value: stats.search_impressions, icon: Search },
    { label: 'منتج اليوم', value: stats.product_of_day, icon: Sparkles },
    { label: 'خانة مميزة', value: stats.featured_slot, icon: Crown },
    { label: 'زيارة المتجر', value: stats.visit_store, icon: ExternalLink },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
        style={{ borderColor: themeConfig.colors.border, backgroundColor: `${themeConfig.colors.surface}ee` }}>
        <button type="button" onClick={goBack} className="p-2 rounded-xl" style={{ backgroundColor: `${themeConfig.colors.primary}12` }}>
          <ChevronLeft size={18} style={{ color: themeConfig.colors.primary }} />
        </button>
        <div>
          <h1 className="text-base font-black" style={{ color: themeConfig.colors.text }}>لوحة التحليلات</h1>
          <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>ابدأ مجاناً وادفع كلما كبرت</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        {(role !== 'store' && role !== 'company') && (
          <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>
            هذه اللوحة متاحة لحسابات المتجر والشركة بعد الموافقة.
          </p>
        )}
        {loading && <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>}
        {error && <p className="text-sm" style={{ color: themeConfig.colors.error }}>{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border p-3" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color: themeConfig.colors.primary }} />
                  <span className="text-[11px] font-bold" style={{ color: themeConfig.colors.textMuted }}>{card.label}</span>
                </div>
                <p className="text-xl font-black" style={{ color: themeConfig.colors.text }}>{card.value}</p>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] leading-5" style={{ color: themeConfig.colors.textMuted }}>
          مؤشرات التحويل التفصيلية حسب الولاية والفئة · قريبًا مع نمو البيانات.
        </p>
      </div>
    </div>
  );
}
