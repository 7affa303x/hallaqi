import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { getOwnerAnalyticsSummary } from '@/lib/marketplace';
import {
  ChevronLeft, Eye, MousePointerClick, Bookmark, UserRound, Search, Sparkles, Crown, ExternalLink, RefreshCw, Copy,
} from 'lucide-react';

export default function BusinessAnalyticsPage() {
  const { themeConfig, goBack, navigate } = useApp();
  const { appUser } = useAuth();
  const role = appUser?.user_role;
  const ownerType = role === 'company' ? 'company' : 'store';
  const [stats, setStats] = useState({
    views: 0, clicks: 0, saves: 0, profile_visits: 0, search_impressions: 0,
    product_of_day: 0, featured_slot: 0, visit_store: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copyMsg, setCopyMsg] = useState('');

  const load = useCallback(async () => {
    if (!appUser?.id || (role !== 'store' && role !== 'company')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await getOwnerAnalyticsSummary(appUser.id, ownerType);
      setStats(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل التحليلات');
    } finally {
      setLoading(false);
    }
  }, [appUser?.id, ownerType, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = [
    { label: 'المشاهدات', value: stats.views, icon: Eye, key: 'views' },
    { label: 'النقرات', value: stats.clicks, icon: MousePointerClick, key: 'clicks' },
    { label: 'الحفظ', value: stats.saves, icon: Bookmark, key: 'saves' },
    { label: 'زيارات الصفحة', value: stats.profile_visits, icon: UserRound, key: 'profile_visits' },
    { label: 'ظهور البحث', value: stats.search_impressions, icon: Search, key: 'search_impressions' },
    { label: 'منتج اليوم', value: stats.product_of_day, icon: Sparkles, key: 'product_of_day' },
    { label: 'خانة مميزة', value: stats.featured_slot, icon: Crown, key: 'featured_slot' },
    { label: 'زيارة المتجر', value: stats.visit_store, icon: ExternalLink, key: 'visit_store' },
  ];

  const topMetric = useMemo(() => {
    return cards.reduce((best, c) => (c.value > best.value ? c : best), cards[0]);
  }, [stats]);

  const allZero = cards.every(c => c.value === 0);
  const savesRate = stats.views > 0 ? (100 * stats.saves / stats.views).toFixed(1) : null;
  const visitGoal = 10;
  const visitProgress = Math.min(100, Math.round((stats.visit_store / visitGoal) * 100));

  const exportSummary = async () => {
    const lines = [
      'ملخص تحليلات Hallaqi',
      `آخر تحديث: ${lastUpdated?.toLocaleString('ar-DZ') || '—'}`,
      ...cards.map(c => `${c.label}: ${c.value}`),
      savesRate != null ? `معدل الحفظ: ${savesRate}%` : '',
      `CTR تقريبي: ${stats.search_impressions > 0 ? (100 * stats.clicks / stats.search_impressions).toFixed(1) : '—'}%`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      setCopyMsg('تم نسخ الملخص');
      window.setTimeout(() => setCopyMsg(''), 2500);
    } catch {
      setCopyMsg('تعذر النسخ');
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
        style={{ borderColor: themeConfig.colors.border, backgroundColor: `${themeConfig.colors.surface}ee` }}>
        <button type="button" onClick={goBack} className="p-2 rounded-xl" style={{ backgroundColor: `${themeConfig.colors.primary}12` }}>
          <ChevronLeft size={18} style={{ color: themeConfig.colors.primary }} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-black" style={{ color: themeConfig.colors.text }}>لوحة التحليلات</h1>
          <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
            {lastUpdated ? `آخر تحديث · ${lastUpdated.toLocaleTimeString('ar-DZ')}` : 'ابدأ مجاناً وادفع كلما كبرت'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="p-2 rounded-xl"
          style={{ backgroundColor: `${themeConfig.colors.primary}12` }}
          aria-label="تحديث"
        >
          <RefreshCw size={16} style={{ color: themeConfig.colors.primary }} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        {(role !== 'store' && role !== 'company') && (
          <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>
            هذه اللوحة متاحة لحسابات المتجر والشركة بعد الموافقة.
          </p>
        )}
        {loading && <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>}
        {error && <p className="text-sm" style={{ color: themeConfig.colors.error }}>{error}</p>}
        {copyMsg && <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.success }}>{copyMsg}</p>}

        {allZero && !loading && (
          <div className="rounded-2xl border p-3" style={{ borderColor: themeConfig.colors.border, backgroundColor: `${themeConfig.colors.primary}08` }}>
            <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>نصيحة للبداية</p>
            <p className="text-[11px] mt-1 leading-5" style={{ color: themeConfig.colors.textMuted }}>
              أضف منتجات نشطة من الكتالوج وشارك صفحة متجرك — ستظهر المشاهدات والنقرات هنا فور أول تفاعل.
            </p>
          </div>
        )}

        {!allZero && (
          <div className="rounded-2xl border p-3" style={{ borderColor: `${themeConfig.colors.accent}44`, backgroundColor: `${themeConfig.colors.accent}10` }}>
            <p className="text-[10px] font-bold" style={{ color: themeConfig.colors.accent }}>أعلى مؤشر</p>
            <p className="text-sm font-black" style={{ color: themeConfig.colors.text }}>
              {topMetric.label}: {topMetric.value}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {cards.map(card => {
            const Icon = card.icon;
            const isTop = !allZero && card.key === topMetric.key;
            return (
              <div
                key={card.label}
                className="rounded-2xl border p-3"
                style={{
                  borderColor: isTop ? themeConfig.colors.accent : themeConfig.colors.border,
                  backgroundColor: themeConfig.colors.surface,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color: themeConfig.colors.primary }} />
                  <span className="text-[11px] font-bold" style={{ color: themeConfig.colors.textMuted }}>{card.label}</span>
                </div>
                <p className="text-xl font-black" style={{ color: themeConfig.colors.text }}>{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border p-3" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
          <p className="text-xs font-bold mb-1" style={{ color: themeConfig.colors.text }}>قمع التحويل (تقريبي)</p>
          <p className="text-[11px] leading-5" style={{ color: themeConfig.colors.textMuted }}>
            ظهور بحث {stats.search_impressions} → نقرات {stats.clicks} → زيارة متجر {stats.visit_store}
            {stats.search_impressions > 0 && (
              <> · CTR {(100 * stats.clicks / stats.search_impressions).toFixed(1)}%</>
            )}
            {stats.clicks > 0 && (
              <> · Visit rate {(100 * stats.visit_store / stats.clicks).toFixed(1)}%</>
            )}
            {savesRate != null && (
              <> · معدل الحفظ {savesRate}%</>
            )}
          </p>
        </div>

        <div className="rounded-2xl border p-3" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
          <p className="text-xs font-bold mb-1" style={{ color: themeConfig.colors.text }}>
            هدف: {visitGoal} نقرات «زيارة المتجر»
          </p>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: themeConfig.colors.border }}>
            <div className="h-full rounded-full" style={{ width: `${visitProgress}%`, backgroundColor: themeConfig.colors.primary }} />
          </div>
          <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.textMuted }}>
            {stats.visit_store} / {visitGoal}
          </p>
        </div>

        <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
          مقارنة بالأمس · قريبًا (بيانات يومية تفصيلية)
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void exportSummary()}
            className="flex-1 h-10 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5"
            style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
          >
            <Copy size={14} /> نسخ الملخص
          </button>
          <button
            type="button"
            onClick={() => navigate('seller-catalog')}
            className="flex-1 h-10 rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            الكتالوج
          </button>
        </div>

        <p className="text-[11px] leading-5" style={{ color: themeConfig.colors.textMuted }}>
          مؤشرات التحويل التفصيلية حسب الولاية والفئة · قريبًا مع نمو البيانات.
        </p>
      </div>
    </div>
  );
}
