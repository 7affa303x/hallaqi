import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { X, CalendarDays, ShoppingBag, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'hallaqi-onboarding-v1-done';

/**
 * First-visit soft onboarding — one composition, three short steps.
 * Skippable; never blocks the app.
 */
export default function SoftOnboarding() {
  const { themeConfig, setActiveTab, navigate } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
      setOpen(true);
    } catch {
      // ignore
    }
  }, []);

  if (!open) return null;

  const steps = [
    {
      icon: CalendarDays,
      title: 'احجز موعدك بسهولة',
      body: 'اكتشف حلاقين قربك، اختر الخدمة، وادفع نقداً عند الزيارة.',
      cta: 'استكشف الحجز',
      action: () => setActiveTab('booking'),
    },
    {
      icon: ShoppingBag,
      title: 'سوق العناية',
      body: 'تصفّح منتجات ومتاجر وشركات — الشراء عبر زيارة المتجر الخارجي.',
      cta: 'افتح السوق',
      action: () => setActiveTab('marketplace'),
    },
    {
      icon: Sparkles,
      title: 'مساعد AI مجاني',
      body: 'نصائح عناية بالعربية عبر Groq. صور AI وتجربة الوجه متوقفة حالياً.',
      cta: 'جرّب المساعد',
      action: () => setActiveTab('ai-hub'),
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,.45)' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="w-full max-w-md rounded-3xl border p-5 shadow-xl"
        style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${themeConfig.colors.primary}15` }}>
            <Icon size={22} style={{ color: themeConfig.colors.primary }} />
          </div>
          <button type="button" onClick={finish} aria-label="إغلاق" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
            <X size={16} style={{ color: themeConfig.colors.textMuted }} />
          </button>
        </div>
        <p className="text-[10px] font-bold mt-3" style={{ color: themeConfig.colors.textMuted }}>
          خطوة {step + 1} من {steps.length}
        </p>
        <h2 id="onboarding-title" className="text-lg font-black mt-1" style={{ color: themeConfig.colors.text }}>
          {current.title}
        </h2>
        <p className="text-sm mt-2 leading-6" style={{ color: themeConfig.colors.textMuted }}>
          {current.body}
        </p>
        <div className="flex gap-2 mt-5">
          {step < steps.length - 1 ? (
            <>
              <button
                type="button"
                onClick={finish}
                className="flex-1 h-11 rounded-xl text-xs font-bold border"
                style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
              >
                تخطّي
              </button>
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="flex-1 h-11 rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: themeConfig.colors.primary }}
              >
                التالي
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { current.action(); finish(); }}
              className="w-full h-11 rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              {current.cta}
            </button>
          )}
        </div>
        <button
          type="button"
          className="w-full mt-2 text-[10px] font-bold"
          style={{ color: themeConfig.colors.textMuted }}
          onClick={() => navigate('register')}
        >
          أو أنشئ حساباً كمتجر / حلاق / طبيب
        </button>
      </div>
    </div>
  );
}
