import { useEffect, useId, useRef, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analyticsConsent';

const ONBOARDING_KEY = 'hallaqi-onboarding-v1-done';

/**
 * Soft privacy banner — enables Vercel Analytics only after accept.
 * Delayed until soft onboarding is done so first visit isn't stacked with overlays.
 * Interval stops once shown or once the user has chosen — otherwise the poll
 * would re-open the banner after Accept/Decline.
 */
export default function CookieConsent({
  onChange,
}: {
  onChange?: (value: AnalyticsConsent) => void;
}) {
  const { themeConfig, settings } = useApp();
  const [visible, setVisible] = useState(false);
  const titleId = useId();
  const acceptRef = useRef<HTMLButtonElement>(null);
  const settledRef = useRef(readAnalyticsConsent() !== null);

  useEffect(() => {
    if (settledRef.current) return;

    let cancelled = false;
    let poll: number | undefined;

    const stop = () => {
      if (poll !== undefined) {
        window.clearInterval(poll);
        poll = undefined;
      }
    };

    const tryShow = () => {
      if (cancelled || settledRef.current) {
        stop();
        return;
      }
      if (readAnalyticsConsent() !== null) {
        settledRef.current = true;
        stop();
        setVisible(false);
        return;
      }
      try {
        if (localStorage.getItem(ONBOARDING_KEY) !== '1') return;
      } catch {
        // storage blocked — still show after fallback timeout
      }
      stop();
      setVisible(true);
    };

    poll = window.setInterval(tryShow, 800);
    const fallback = window.setTimeout(() => {
      if (cancelled || settledRef.current || readAnalyticsConsent() !== null) return;
      stop();
      setVisible(true);
    }, 12000);

    return () => {
      cancelled = true;
      stop();
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (visible) acceptRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  const choose = (value: 'accepted' | 'declined') => {
    settledRef.current = true;
    writeAnalyticsConsent(value);
    setVisible(false);
    onChange?.(value);
  };

  const lang = settings.language;
  const title =
    lang === 'en' ? 'Performance analytics (optional)'
      : lang === 'fr' ? 'Analyses de performance (optionnel)'
        : 'تحليلات الأداء (اختياري)';
  const body =
    lang === 'en'
      ? 'We measure app performance anonymously when possible. You can decline and continue — booking works without it.'
      : lang === 'fr'
        ? 'Nous mesurons les performances de façon anonymisée autant que possible. Vous pouvez refuser — la réservation fonctionne sans.'
        : 'نقيس أداء التطبيق بشكل مجهّل قدر الإمكان. يمكنك الرفض والمتابعة عادي — الحجز يعمل بدونها.';
  const declineLabel = lang === 'en' ? 'Decline' : lang === 'fr' ? 'Refuser' : 'رفض';
  const acceptLabel = lang === 'en' ? 'Accept' : lang === 'fr' ? 'Accepter' : 'قبول';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-1.5rem)] max-w-md rounded-2xl border p-4 shadow-lg"
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
          type="button"
          onClick={() => choose('declined')}
          className="flex-1 h-10 rounded-xl text-xs font-bold border"
          style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
        >
          {declineLabel}
        </button>
        <button
          ref={acceptRef}
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
