import { useEffect, useId, useRef, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import {
  hasAnalyticsDecision,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analyticsConsent';

const ONBOARDING_KEY = 'hallaqi-onboarding-v1-done';

const AUTH_SCREENS = new Set([
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'mfa-challenge',
]);

/**
 * Optional performance analytics banner.
 * Hidden on auth screens; never reappears after accept/decline (localStorage + cookie).
 */
export default function CookieConsent({
  onChange,
}: {
  onChange?: (value: AnalyticsConsent) => void;
}) {
  const { themeConfig, screen, settings } = useApp();
  const [visible, setVisible] = useState(false);
  const titleId = useId();
  const declineRef = useRef<HTMLButtonElement>(null);
  const lang = settings.language;

  useEffect(() => {
    if (hasAnalyticsDecision()) {
      setVisible(false);
      return;
    }
    if (AUTH_SCREENS.has(screen)) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    const tryShow = () => {
      if (cancelled || hasAnalyticsDecision()) return;
      if (AUTH_SCREENS.has(screen)) return;
      try {
        // Prefer waiting until soft onboarding is done, but don't block forever.
        if (localStorage.getItem(ONBOARDING_KEY) !== '1') return;
      } catch {
        /* show anyway */
      }
      setVisible(true);
    };

    const poll = window.setInterval(tryShow, 1000);
    // No aggressive force-show — wait until onboarding is done so overlays don't stack.

    tryShow();

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [screen]);

  useEffect(() => {
    if (visible) declineRef.current?.focus();
  }, [visible]);

  if (!visible || hasAnalyticsDecision()) return null;

  const choose = (value: 'accepted' | 'declined') => {
    writeAnalyticsConsent(value);
    setVisible(false);
    onChange?.(value);
  };

  const title =
    lang === 'en' ? 'Performance analytics (optional)'
      : lang === 'fr' ? 'Analytique de perf. (optionnel)'
        : 'تحليلات الأداء (اختياري)';
  const body =
    lang === 'en'
      ? 'We measure app performance as anonymously as possible. Decline anytime — booking works without it.'
      : lang === 'fr'
        ? 'Mesure anonyme des perfs. Vous pouvez refuser — la réservation fonctionne sans.'
        : 'نقيس أداء التطبيق بشكل مجهّل قدر الإمكان. يمكنك الرفض والمتابعة عادي — الحجز يعمل بدونها.';
  const declineLabel = lang === 'en' ? 'Decline' : lang === 'fr' ? 'Refuser' : 'رفض';
  const acceptLabel = lang === 'en' ? 'Accept' : lang === 'fr' ? 'Accepter' : 'قبول';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed bottom-20 inset-x-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[110] sm:w-[calc(100%-1.5rem)] sm:max-w-md rounded-2xl border p-4 shadow-lg"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
    >
      <p id={titleId} className="text-xs font-black" style={{ color: themeConfig.colors.text }}>
        {title}
      </p>
      <p className="text-[11px] mt-1.5 leading-5" style={{ color: themeConfig.colors.textMuted }}>
        {body}
      </p>
      <div className="flex gap-2 mt-3">
        <button
          ref={declineRef}
          type="button"
          onClick={() => choose('declined')}
          className="flex-1 h-10 rounded-xl text-xs font-bold border"
          style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
        >
          {declineLabel}
        </button>
        <button
          type="button"
          onClick={() => choose('accepted')}
          className="flex-1 h-10 rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: themeConfig.colors.primary }}
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}
