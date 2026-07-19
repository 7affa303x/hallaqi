import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Crown, Sparkles, Store, Building2, Stethoscope, BarChart3, Wand2, Package, Megaphone, BadgeCheck, Settings2 } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import {
  ensureMarketplaceSellerProfile,
  getMarketplacePlans,
  requestMarketplaceSubscription,
  requestDoctorFreeVerification,
} from '@/supabase/marketplace';
import { MARKETPLACE_PREMIUM_LISTING_CAP } from '@/types/marketplace';
import { canAccessAiListingTools } from '@/lib/marketplace/planAccess';
import { FEATURE_FLAGS, PAUSED_LABEL } from '@/lib/featureFlags';
import PausedFeatureBanner from '@/components/PausedFeatureBanner';
import type { MarketplacePlanTier, MarketplaceSeller, MarketplaceSubscriptionPlan } from '@/types/marketplace';

/**
 * Role-separated seller dashboard for Store / Company / Doctor.
 * No shared barber booking studio logic.
 */
export default function SellerDashboardPage() {
  const { themeConfig, goBack, navigate, screenParams } = useApp();
  const { appUser } = useAuth();
  const role = (screenParams?.role || (appUser?.user_role as 'store' | 'company' | 'doctor') || 'store') as 'store' | 'company' | 'doctor';
  const sellerId = appUser?.id || screenParams?.sellerId || `demo-${role}`;
  const [plans, setPlans] = useState<MarketplaceSubscriptionPlan[]>([]);
  const [seller, setSeller] = useState<MarketplaceSeller | null>(null);
  const [selected, setSelected] = useState<MarketplacePlanTier>('free');
  const [requested, setRequested] = useState(false);
  const [doctorVerified, setDoctorVerified] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    void (async () => {
      const list = await getMarketplacePlans(role);
      setPlans(list);
      const profile = await ensureMarketplaceSellerProfile({
        id: sellerId,
        sellerType: role,
        displayName: appUser?.full_name || 'متجري',
      });
      setSeller(profile);
      setSelected(profile.subscriptionPlan || 'free');
      if (profile.isTrustedDoctor || profile.isVerified) setDoctorVerified(true);
      else {
        try {
          setDoctorVerified(localStorage.getItem(`hallaqi-doctor-verify-${sellerId}`) === 'requested');
        } catch { /* ignore */ }
      }
    })();
  }, [sellerId, role, appUser?.full_name]);

  const title = role === 'company' ? 'لوحة الشركة' : role === 'doctor' ? 'لوحة الدكتور' : 'لوحة المتجر';
  const Icon = role === 'company' ? Building2 : role === 'doctor' ? Stethoscope : Store;

  const requestPlan = async () => {
    if (!FEATURE_FLAGS.paidSubscriptionsEnabled && selected !== 'free') {
      setToast('ترقية الاشتراك المدفوع متوقفة حالياً');
      return;
    }
    const result = await requestMarketplaceSubscription(sellerId, selected);
    if (result.ok) {
      setRequested(true);
      setToast('تم إرسال طلب الاشتراك للأدمن');
    } else {
      setToast(result.error);
    }
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }} aria-label="رجوع">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-black flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
            <Icon size={16} /> {title}
          </h1>
          {seller && (
            <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
              {seller.displayName} · {seller.approvalStatus} · {seller.subscriptionPlan}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border p-4 mb-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        {seller?.approvalStatus === 'pending' || screenParams?.pendingApproval === '1' ? (
          <div className="mb-3 rounded-xl p-3" style={{ backgroundColor: `${themeConfig.colors.warning}15` }}>
            <p className="text-sm font-black" style={{ color: themeConfig.colors.warning }}>بانتظار موافقة الإدارة</p>
            <p className="text-[11px] mt-1 leading-5" style={{ color: themeConfig.colors.textMuted }}>
              يمكنك تجهيز ملفك ومنتجاتك الآن. الظهور العام في السوق يبدأ بعد الموافقة.
            </p>
          </div>
        ) : null}
        <p className="text-sm font-black" style={{ color: themeConfig.colors.text }}>ابدأ مجاناً — ادفع مع نموّك</p>
        <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>
          Start free · Pay as you grow. الحد الأقصى للبريميوم {MARKETPLACE_PREMIUM_LISTING_CAP} منتج — ليس غير محدود.
        </p>
        {role === 'doctor' && (
          <div className="mt-3">
            <p className="text-xs font-bold" style={{ color: themeConfig.colors.primary }}>
              التوثيق والشهادة مجانيان لحسابات الأطباء.
            </p>
            <button
              type="button"
              disabled={doctorVerified}
              onClick={() => {
                void requestDoctorFreeVerification(sellerId).then(r => {
                  if (r.ok) {
                    setDoctorVerified(true);
                    setToast('تم إرسال طلب التوثيق المجاني للأدمن');
                  } else setToast(r.error || 'فشل');
                });
              }}
              className="mt-2 w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1"
              style={{
                backgroundColor: doctorVerified ? `${themeConfig.colors.success}18` : themeConfig.colors.primary,
                color: doctorVerified ? themeConfig.colors.success : '#fff',
              }}
            >
              <BadgeCheck size={14} />
              {doctorVerified ? 'طلب التوثيق المجاني مُرسل / مفعّل' : 'طلب توثيق مجاني'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          type="button"
          className="rounded-2xl border p-3 text-right"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          onClick={() => navigate('seller-profile-edit', { sellerId, role })}
        >
          <Settings2 size={16} style={{ color: themeConfig.colors.primary }} />
          <p className="text-xs font-black mt-1" style={{ color: themeConfig.colors.text }}>الملف</p>
        </button>
        <button
          type="button"
          className="rounded-2xl border p-3 text-right"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          onClick={() => navigate('seller-products', { sellerId, role, plan: selected })}
        >
          <Package size={16} style={{ color: themeConfig.colors.primary }} />
          <p className="text-xs font-black mt-1" style={{ color: themeConfig.colors.text }}>المنتجات</p>
        </button>
        <button
          type="button"
          className="rounded-2xl border p-3 text-right"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          onClick={() => navigate('seller-placements', { sellerId, role })}
        >
          <Megaphone size={16} style={{ color: themeConfig.colors.accent }} />
          <p className="text-xs font-black mt-1" style={{ color: themeConfig.colors.text }}>مواضع الإعلان</p>
        </button>
        <button
          type="button"
          className="rounded-2xl border p-3 text-right"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          onClick={() => navigate('marketplace-analytics', { sellerId, role, plan: selected })}
        >
          <BarChart3 size={16} style={{ color: themeConfig.colors.primary }} />
          <p className="text-xs font-black mt-1" style={{ color: themeConfig.colors.text }}>التحليلات</p>
        </button>
        <button
          type="button"
          className="rounded-2xl border p-3 text-right col-span-2"
          style={{
            backgroundColor: themeConfig.colors.surface,
            borderColor: themeConfig.colors.border,
            opacity: canAccessAiListingTools(selected) ? 1 : 0.7,
          }}
          onClick={() => {
            if (!canAccessAiListingTools(selected)) {
              setToast('أدوات AI متاحة من الخطة الأساسية فما فوق');
              return;
            }
            navigate('ai-listing-tools', { role, plan: selected });
          }}
        >
          <Wand2 size={16} style={{ color: themeConfig.colors.accent }} />
          <p className="text-xs font-black mt-1" style={{ color: themeConfig.colors.text }}>
            أدوات AI للقوائم {canAccessAiListingTools(selected) ? '' : '(أساسي+)'}
          </p>
        </button>
      </div>

      {!FEATURE_FLAGS.paidSubscriptionsEnabled && (
        <PausedFeatureBanner
          className="mb-3"
          title="الترقية المدفوعة"
          description="متوقفة عند الإطلاق. ابقَ على المجاني وجهّز منتجاتك؛ المواضع المدفوعة متوقفة أيضاً."
          kind="paused"
          colors={themeConfig.colors}
        />
      )}
      <h2 className="text-sm font-black mb-2 flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
        <Crown size={14} /> خطط الاشتراك {role === 'company' ? '(تسعير الشركات)' : ''}
        {!FEATURE_FLAGS.paidSubscriptionsEnabled && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{PAUSED_LABEL}</span>
        )}
      </h2>
      {!FEATURE_FLAGS.paidSubscriptionsEnabled && (
        <p className="text-[11px] mb-2 leading-5" style={{ color: themeConfig.colors.warning }}>
          الترقية المدفوعة متوقفة عند الإطلاق. يمكنك البقاء على المجاني وتجهيز منتجاتك.
        </p>
      )}
      <div className="space-y-2">
        {plans.map(planItem => (
          <button
            key={planItem.id}
            type="button"
            onClick={() => setSelected(planItem.id)}
            className="w-full rounded-2xl border p-3 text-right"
            style={{
              backgroundColor: selected === planItem.id ? `${themeConfig.colors.primary}10` : themeConfig.colors.surface,
              borderColor: selected === planItem.id ? themeConfig.colors.primary : themeConfig.colors.border,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black" style={{ color: themeConfig.colors.text }}>{planItem.nameAr}</span>
              <span className="text-xs font-bold" style={{ color: themeConfig.colors.primary }}>
                {planItem.priceDzd === 0 ? 'مجاني' : `${planItem.priceDzd.toLocaleString('ar-DZ')} دج/شهر`}
                {planItem.priceDzd > 0 && !FEATURE_FLAGS.paidSubscriptionsEnabled ? ` · ${PAUSED_LABEL}` : ''}
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: themeConfig.colors.textMuted }}>
              حد القوائم: {planItem.listingCap} · مميز: {planItem.featuredSlots} · بانر: {planItem.bannerSlots}
            </p>
            <ul className="mt-2 space-y-1">
              {planItem.features.map(f => (
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
        disabled={requested || (!FEATURE_FLAGS.paidSubscriptionsEnabled && selected !== 'free')}
        onClick={() => void requestPlan()}
        className="w-full mt-4 py-3 rounded-2xl text-sm font-black text-white"
        style={{ backgroundColor: themeConfig.colors.primary, opacity: (requested || (!FEATURE_FLAGS.paidSubscriptionsEnabled && selected !== 'free')) ? 0.55 : 1 }}
      >
        {!FEATURE_FLAGS.paidSubscriptionsEnabled && selected !== 'free'
          ? `الترقية ${PAUSED_LABEL}`
          : requested ? 'تم إرسال طلب الاشتراك للأدمن' : 'طلب ترقية الخطة'}
      </button>
      {toast && <p className="text-xs text-center mt-2 font-bold" style={{ color: themeConfig.colors.success }}>{toast}</p>}

      <div className="mt-4 rounded-2xl border p-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <p className="text-xs font-bold flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
          <Sparkles size={12} /> مواضع الإعلان {!FEATURE_FLAGS.paidPlacementsEnabled && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{PAUSED_LABEL}</span>}
        </p>
        <ul className="mt-2 text-[11px] space-y-1" style={{ color: themeConfig.colors.textMuted }}>
          <li>• ظهور مميز / Featured</li>
          <li>• متجر مميز</li>
          <li>• منتج اليوم (موضع مدفوع — ليس خصماً عشوائياً)</li>
          <li>• بانرات ورعاية Sponsored</li>
          <li>• شارات بريميوم</li>
          <li>• لا عمولات · لا دفع داخل التطبيق للمنتجات</li>
          {!FEATURE_FLAGS.paidPlacementsEnabled && <li>• طلب المواضع المدفوعة متوقف عند الإطلاق</li>}
        </ul>
      </div>
    </div>
  );
}
