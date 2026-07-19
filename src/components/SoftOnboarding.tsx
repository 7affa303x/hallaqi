import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { translate } from '@/lib/i18n';
import { X, CalendarDays, ShoppingBag, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'hallaqi-onboarding-v1-done';

/**
 * First-visit soft onboarding — one composition, three short steps.
 * Skippable; never blocks the app. Focus trap + Escape for a11y.
 */
export default function SoftOnboarding() {
  const { themeConfig, setActiveTab, navigate, settings } = useApp();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = settings.accessibility.reduceMotion;
  const t = (key: Parameters<typeof translate>[1]) => translate(settings.language, key);

  useEffect(() => {
    if (authLoading) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
      // Returning signed-in users: skip onboarding noise (they already know the app).
      if (isAuthenticated) {
        localStorage.setItem(STORAGE_KEY, '1');
        return;
      }
      setOpen(true);
    } catch {
      // ignore
    }
  }, [authLoading, isAuthenticated]);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finish();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const steps = [
    {
      icon: CalendarDays,
      title: t('onboardingBookingTitle'),
      body: t('onboardingBookingBody'),
      cta: t('booking'),
      action: () => setActiveTab('booking'),
    },
    {
      icon: ShoppingBag,
      title: t('onboardingMarketTitle'),
      body: t('onboardingMarketBody'),
      cta: t('marketplace'),
      action: () => setActiveTab('marketplace'),
    },
    {
      icon: Sparkles,
      title: t('onboardingAiTitle'),
      body: t('onboardingAiBody'),
      cta: t('assistant'),
      action: () => setActiveTab('ai-hub'),
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,.45)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="w-full max-w-md rounded-3xl border p-5 shadow-xl"
        style={{
          backgroundColor: themeConfig.colors.surface,
          borderColor: themeConfig.colors.border,
          transition: reduceMotion ? 'none' : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${themeConfig.colors.primary}15` }}>
            <Icon size={22} style={{ color: themeConfig.colors.primary }} />
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={finish}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: themeConfig.colors.background }}
          >
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
                {t('skip')}
              </button>
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="flex-1 h-11 rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: themeConfig.colors.primary }}
              >
                {t('next')}
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
