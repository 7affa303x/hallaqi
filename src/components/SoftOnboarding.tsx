import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { translate } from '@/lib/i18n';
import { X, CalendarDays, MapPin, UserPlus } from 'lucide-react';

const STORAGE_KEY = 'hallaqi-onboarding-v2-done';

/**
 * First-visit soft onboarding — booking cash + wilaya + account.
 * Skippable; never blocks the app.
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
      icon: MapPin,
      title: t('onboardingWilayaTitle'),
      body: t('onboardingWilayaBody'),
      cta: t('onboardingWilayaCta'),
      action: () => setActiveTab('booking'),
    },
    {
      icon: UserPlus,
      title: t('onboardingAccountTitle'),
      body: t('onboardingAccountBody'),
      cta: t('onboardingAccountCta'),
      action: () => navigate('register'),
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
            aria-label={t('skip')}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ color: themeConfig.colors.textMuted }}
          >
            <X size={18} />
          </button>
        </div>

        <h2 id="onboarding-title" className="mt-4 text-lg font-bold" style={{ color: themeConfig.colors.text }}>
          {current.title}
        </h2>
        <p className="mt-2 text-sm leading-6" style={{ color: themeConfig.colors.textMuted }}>
          {current.body}
        </p>

        <div className="flex gap-1.5 mt-4" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: i === step ? themeConfig.colors.primary : themeConfig.colors.border }}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          {step < steps.length - 1 ? (
            <>
              <button
                type="button"
                onClick={finish}
                className="flex-1 h-11 rounded-xl text-sm font-bold"
                style={{ color: themeConfig.colors.textMuted }}
              >
                {t('skip')}
              </button>
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="flex-[1.4] h-11 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: themeConfig.colors.primary }}
              >
                {t('next')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  finish();
                  current.action();
                }}
                className="flex-1 h-11 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: themeConfig.colors.primary }}
              >
                {current.cta}
              </button>
              <button
                type="button"
                onClick={finish}
                className="h-11 px-4 rounded-xl text-sm font-bold"
                style={{ color: themeConfig.colors.textMuted }}
              >
                {t('skip')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
