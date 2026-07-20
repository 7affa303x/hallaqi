import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { hasVerifiedMfaFactor, verifyMfaCode } from '@/lib/mfa';
import BrandLogo from '@/components/BrandLogo';

export default function MFAChallengePage() {
  const { themeConfig, navigate } = useApp();
  const { logout } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingFactor, setCheckingFactor] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void hasVerifiedMfaFactor()
      .then(hasFactor => {
        if (cancelled) return;
        if (!hasFactor) {
          // Transient AAL failure without enrolled MFA — do not trap the user.
          navigate('home');
          return;
        }
        setCheckingFactor(false);
      })
      .catch(() => {
        // Probe failed — send user home rather than a stuck blank challenge UI.
        if (!cancelled) navigate('home');
      });
    return () => { cancelled = true; };
  }, [navigate]);

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('أدخل الرمز المكون من 6 أرقام');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyMfaCode(code);
      navigate('home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  if (checkingFactor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: themeConfig.colors.background }}>
        <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>جاري التحقق من الأمان...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="w-full max-w-sm p-5 rounded-3xl border text-center" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <BrandLogo variant="icon" className="w-16 h-16 mx-auto shadow" priority />
        <div className="w-12 h-12 rounded-xl mx-auto mt-4 flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '12' }}><ShieldCheck size={24} style={{ color: themeConfig.colors.primary }} /></div>
        <h1 className="text-lg font-bold mt-3" style={{ color: themeConfig.colors.text }}>التحقق بخطوتين</h1>
        <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>أدخل الرمز الظاهر في تطبيق المصادقة</p>
        <input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="رمز المصادقة" className="w-full h-14 mt-5 rounded-xl border text-center text-2xl tracking-[0.45em] font-mono" style={{ backgroundColor: themeConfig.colors.background, borderColor: error ? themeConfig.colors.error : themeConfig.colors.border, color: themeConfig.colors.text }} />
        {error && <p role="alert" className="text-xs mt-2" style={{ color: themeConfig.colors.error }}>{error}</p>}
        <button onClick={() => void verify()} disabled={loading || code.length !== 6} className="w-full h-11 rounded-xl text-sm font-bold text-white mt-4 disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary }}>{loading ? 'جاري التحقق...' : 'تحقق'}</button>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full h-10 rounded-xl text-xs font-bold mt-2"
          style={{ color: themeConfig.colors.textMuted }}
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
