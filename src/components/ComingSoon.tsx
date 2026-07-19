import { useApp } from '@/contexts/useApp';
import { Clock, ArrowLeft, PauseCircle } from 'lucide-react';
import { COMING_SOON_LABEL, PAUSED_LABEL } from '@/lib/featureFlags';

interface ComingSoonProps {
  title: string;
  description?: string;
  eta?: string;
  /** soon = قريباً, paused = متوقف */
  status?: 'soon' | 'paused';
}

export default function ComingSoon({ title, description, eta, status = 'soon' }: ComingSoonProps) {
  const { themeConfig, goBack } = useApp();
  const isPaused = status === 'paused';
  const badge = isPaused ? PAUSED_LABEL : COMING_SOON_LABEL;
  const Icon = isPaused ? PauseCircle : Clock;
  const tone = isPaused ? themeConfig.colors.warning : themeConfig.colors.primary;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b"
        style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={goBack} className="w-10 h-10 rounded-xl flex items-center justify-center" aria-label="رجوع">
          <ArrowLeft size={22} style={{ color: themeConfig.colors.text }} />
        </button>
        <h1 className="text-base font-bold flex-1" style={{ color: themeConfig.colors.text }}>{title}</h1>
        <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ backgroundColor: `${tone}18`, color: tone }}>
          {badge}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{ backgroundColor: `${tone}12` }}>
          <Icon size={40} style={{ color: tone }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: themeConfig.colors.text }}>{badge}</h2>
        <p className="text-sm max-w-xs leading-6" style={{ color: themeConfig.colors.textMuted }}>
          {description || (isPaused
            ? 'هذه الميزة متوقفة عمداً عند الإطلاق الناعم وسأُفعَّل لاحقاً بعد اكتمال الإعداد.'
            : 'هذه الميزة قيد التطوير وستتوفر في تحديث قادم')}
        </p>
        {eta && (
          <div className="mt-3 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: themeConfig.colors.accent + '15', color: themeConfig.colors.accent }}>
            متوقع: {eta}
          </div>
        )}

        {!isPaused && (
          <p className="mt-6 text-[11px] max-w-xs leading-5" style={{ color: themeConfig.colors.textMuted }}>
            سنعلن عن التفعيل داخل التطبيق عند الجاهزية — لا حاجة لتسجيل تنبيه الآن.
          </p>
        )}
        {isPaused && (
          <p className="mt-6 text-[11px] max-w-xs leading-5" style={{ color: themeConfig.colors.textMuted }}>
            لا حاجة لأي إجراء منك الآن. باقي التطبيق يعمل بشكل طبيعي.
          </p>
        )}
      </div>
    </div>
  );
}
