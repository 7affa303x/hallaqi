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
 */
export default function CookieConsent({
  onChange,
}: {
  onChange?: (value: AnalyticsConsent) => void;
}) {
  const { themeConfig } = useApp();
  const [visible, setVisible] = useState(false);
  const titleId = useId();
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (readAnalyticsConsent() !== null) return;

    let cancelled = false;
    const tryShow = () => {
      if (cancelled) return;
      try {
        if (localStorage.getItem(ONBOARDING_KEY) !== '1') return;
      } catch {
        // ignore storage errors — still show after delay
      }
      setVisible(true);
    };

    // Wait for onboarding skip/finish, then a short breath before the banner
    const poll = window.setInterval(tryShow, 800);
    const fallback = window.setTimeout(() => {
      if (!cancelled && readAnalyticsConsent() === null) setVisible(true);
    }, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (visible) acceptRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  const choose = (value: 'accepted' | 'declined') => {
    writeAnalyticsConsent(value);
    setVisible(false);
    onChange?.(value);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-1.5rem)] max-w-md rounded-2xl border p-4 shadow-lg"
      style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
    >
      <p id={titleId} className="text-xs font-black" style={{ color: themeConfig.colors.text }}>
        تحليلات الأداء (اختياري)
      </p>
      <p className="text-[11px] mt-1.5 leading-5" style={{ color: themeConfig.colors.textMuted }}>
        نقيس أداء التطبيق بشكل مجهّل قدر الإمكان. يمكنك الرفض والمتابعة عادي — الحجز يعمل بدونها.
      </p>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => choose('declined')}
          className="flex-1 h-10 rounded-xl text-xs font-bold border"
          style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
        >
          رفض
        </button>
        <button
          ref={acceptRef}
          type="button"
          onClick={() => choose('accepted')}
          className="flex-1 h-10 rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: themeConfig.colors.primary }}
        >
          قبول
        </button>
      </div>
    </div>
  );
}
