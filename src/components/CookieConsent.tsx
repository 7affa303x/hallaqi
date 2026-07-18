import { useEffect, useId, useRef, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analyticsConsent';

/**
 * Soft privacy banner — enables Vercel Analytics only after accept.
 * Not a full CMP; full consent framework is paused for soft launch.
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
    if (readAnalyticsConsent() === null) setVisible(true);
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
        تحليلات الأداء
      </p>
      <p className="text-[11px] mt-1.5 leading-5" style={{ color: themeConfig.colors.textMuted }}>
        نستخدم أدوات قياس أداء مجهّلة الهوية قدر الإمكان (Vercel). يمكنك الرفض والمتابعة بدونها.
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
