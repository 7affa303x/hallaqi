import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Crown, Sparkles, Store, Building2, Stethoscope, BarChart3, Wand2 } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { getMarketplacePlans } from '@/supabase/marketplace';
import { MARKETPLACE_PREMIUM_LISTING_CAP } from '@/types/marketplace';
import type { MarketplacePlanTier, MarketplaceSubscriptionPlan } from '@/types/marketplace';

/**
 * Role-separated seller dashboard for Store / Company / Doctor.
 * No shared barber booking studio logic.
 */
export default function SellerDashboardPage() {
  const { themeConfig, goBack, navigate, screenParams } = useApp();
  const role = (screenParams?.role || 'store') as 'store' | 'company' | 'doctor';
  const [plans, setPlans] = useState<MarketplaceSubscriptionPlan[]>([]);
  const [selected, setSelected] = useState<MarketplacePlanTier>('free');
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    void getMarketplacePlans().then(setPlans);
  }, []);

  const title = role === 'company' ? 'لوحة الشركة' : role === 'doctor' ? 'لوحة الطبيب' : 'لوحة المتجر';
  const Icon = role === 'company' ? Building2 : role === 'doctor' ? Stethoscope : Store;

  return (
    <div className="min-h-screen pb-24 px-4 pt-4" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }} aria-label="رجوع">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-black flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
          <Icon size={16} /> {title}
        </h1>
      </div>

      <div className="rounded-2xl border p-4 mb-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <p className="text-sm font-black" style={{ color: themeConfig.colors.text }}>ابدأ مجاناً — ادفع مع نموّك</p>
        <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>
          Start free · Pay as you grow. الحد الأقصى للبريميوم {MARKETPLACE_PREMIUM_LISTING_CAP} منتج — ليس غير محدود.
        </p>
        {role === 'doctor' && (
          <p className="text-xs mt-2 font-bold" style={{ color: themeConfig.colors.primary }}>
            التوثيق والشهادة مجانيان لحسابات الأطباء.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          type="button"
          className="rounded-2xl border p-3 text-right"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          onClick={() => navigate('marketplace-analytics', { sellerId: `demo-${role}`, role })}
        >
          <BarChart3 size={16} style={{ color: themeConfig.colors.primary }} />
          <p className="text-xs font-black mt-1" style={{ color: themeConfig.colors.text }}>التحليلات</p>
        </button>
        <button
          type="button"
          className="rounded-2xl border p-3 text-right"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          onClick={() => navigate('ai-listing-tools', { role })}
        >
          <Wand2 size={16} style={{ color: themeConfig.colors.accent }} />
          <p className="text-xs font-black mt-1" style={{ color: themeConfig.colors.text }}>أدوات AI للقوائم</p>
        </button>
      </div>

      <h2 className="text-sm font-black mb-2 flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
        <Crown size={14} /> خطط الاشتراك
      </h2>
      <div className="space-y-2">
        {plans.map(plan => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setSelected(plan.id)}
            className="w-full rounded-2xl border p-3 text-right"
            style={{
              backgroundColor: selected === plan.id ? `${themeConfig.colors.primary}10` : themeConfig.colors.surface,
              borderColor: selected === plan.id ? themeConfig.colors.primary : themeConfig.colors.border,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black" style={{ color: themeConfig.colors.text }}>{plan.nameAr}</span>
              <span className="text-xs font-bold" style={{ color: themeConfig.colors.primary }}>
                {plan.priceDzd === 0 ? 'مجاني' : `${plan.priceDzd.toLocaleString('ar-DZ')} دج/شهر`}
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: themeConfig.colors.textMuted }}>
              حد القوائم: {plan.listingCap} · مميز: {plan.featuredSlots} · بانر: {plan.bannerSlots}
            </p>
            <ul className="mt-2 space-y-1">
              {plan.features.map(f => (
                <li key={f} className="text-[11px] flex items-center gap-1" style={{ color: themeConfig.colors.textMuted }}>
                  <Check size={11} style={{ color: themeConfig.colors.primary }} /> {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={requested}
        onClick={() => setRequested(true)}
        className="w-full mt-4 py-3 rounded-2xl text-sm font-black text-white"
        style={{ backgroundColor: themeConfig.colors.primary, opacity: requested ? 0.7 : 1 }}
      >
        {requested ? 'تم إرسال طلب الاشتراك للأدمن' : 'طلب ترقية الخطة'}
      </button>

      <div className="mt-4 rounded-2xl border p-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <p className="text-xs font-bold flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
          <Sparkles size={12} /> مواضع الإعلان المتاحة
        </p>
        <ul className="mt-2 text-[11px] space-y-1" style={{ color: themeConfig.colors.textMuted }}>
          <li>• ظهور مميز / Featured</li>
          <li>• متجر مميز</li>
          <li>• منتج اليوم (موضع مدفوع — ليس خصماً عشوائياً)</li>
          <li>• بانرات ورعاية Sponsored</li>
          <li>• شارات بريميوم</li>
          <li>• لا عمولات · لا دفع داخل التطبيق للمنتجات</li>
        </ul>
      </div>
    </div>
  );
}
