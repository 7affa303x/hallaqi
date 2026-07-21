import { useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { ReferralService } from '@/lib/growth-layer';

/** Landing for /ref/CODE — stores code and redirects to register. */
export default function ReferralLandingPage() {
  const { themeConfig, screenParams, navigate } = useApp();
  const code = screenParams?.referralCode || '';

  useEffect(() => {
    if (code) ReferralService.storePendingCode(code);
  }, [code]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: themeConfig.colors.background }} dir="rtl">
      <p className="text-3xl mb-2">💈</p>
      <h1 className="text-xl font-black mb-2" style={{ color: themeConfig.colors.text }}>مرحباً بك في حلاقي</h1>
      <p className="text-sm mb-1" style={{ color: themeConfig.colors.textMuted }}>تمت دعوتك عبر الكود:</p>
      <p className="text-lg font-black tracking-wider mb-6" style={{ color: themeConfig.colors.primary }}>{code}</p>
      <button
        type="button"
        onClick={() => navigate('register')}
        className="w-full max-w-xs h-12 rounded-2xl text-white font-bold mb-3"
        style={{ backgroundColor: themeConfig.colors.primary }}
      >
        إنشاء حساب
      </button>
      <button type="button" onClick={() => navigate('home')} className="text-sm font-bold" style={{ color: themeConfig.colors.textMuted }}>
        تصفّح التطبيق
      </button>
    </div>
  );
}
