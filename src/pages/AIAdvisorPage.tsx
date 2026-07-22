import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Image, LogIn, MapPin, Send, Sparkles, WandSparkles } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuthGate } from '@/hooks/useAuthGate';
import PausedFeatureBanner from '@/components/PausedFeatureBanner';
import { FEATURE_FLAGS, PAUSED_LABEL } from '@/lib/featureFlags';
import { buildClientSiteContext } from '@/lib/ai/siteContext';
import { clearGalleryHandoff, readGalleryHandoff } from '@/lib/galleryHandoff';
import {
  getAICapabilities,
  requestGroomingAdvice,
  requestStyleImage,
  type AICapabilities,
  type GroomingAdvice,
} from '@/lib/ai/http';

const fallbackCapabilities: AICapabilities = {
  deterministicRecommendations: true,
  optimizedScheduling: true,
  generativeAdvice: false,
  hairstyleImageGeneration: false,
  externalBlocker: 'المساعد ينتظر إعداد مفتاح AI على الخادم (Groq أو Grok أو Gemini).',
};

export default function AIAdvisorPage() {
  const { themeConfig, goBack, navigate, barbers, bookings, currentUser, activeTab, prevTab, setActiveTab } = useApp();
  const { isLoggedIn, needsLogin, ready: authReady } = useAuthGate();
  const [capabilities, setCapabilities] = useState(fallbackCapabilities);
  const [mode, setMode] = useState<'advice' | 'image'>('advice');
  const [question, setQuestion] = useState('');
  const [advice, setAdvice] = useState<GroomingAdvice | null>(null);
  const [styleImage, setStyleImage] = useState('');
  const [galleryHandoff, setGalleryHandoff] = useState(() => readGalleryHandoff()?.dataUrl || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getAICapabilities().then(setCapabilities).catch(() => {
      setCapabilities(fallbackCapabilities);
    });
  }, []);

  useEffect(() => {
    const saved = readGalleryHandoff();
    if (saved?.dataUrl) setGalleryHandoff(saved.dataUrl);
  }, []);

  const imagePaused = !FEATURE_FLAGS.aiImageGenerationEnabled;

  const discoveryWilaya = useMemo(() => {
    try {
      return localStorage.getItem('hallaqi-discovery-wilaya') || undefined;
    } catch {
      return undefined;
    }
  }, []);

  const userWilaya = useMemo(() => {
    if (!currentUser) return undefined;
    if ('wilaya' in currentUser && currentUser.wilaya) return currentUser.wilaya;
    if ('city' in currentUser && currentUser.city) return currentUser.city;
    return undefined;
  }, [currentUser]);

  const siteContext = useMemo(() => buildClientSiteContext({
    barbers,
    bookings,
    userWilaya,
    discoveryWilaya,
  }), [barbers, bookings, userWilaya, discoveryWilaya]);

  const contextLabel = siteContext.wilaya
    ? `مرتبط بمنطقة ${siteContext.wilaya}`
    : 'مرتبط بمنصة حلاقي';

  const submit = async () => {
    if (question.trim().length < 5) return;
    if (!isLoggedIn) {
      setError('يجب تسجيل الدخول لاستخدام المساعد الذكي');
      navigate('login', { redirectScreen: 'ai-advisor' });
      return;
    }
    if (mode === 'image' && imagePaused) {
      setError(`توليد صور التسريحات ${PAUSED_LABEL} — حصة Gemini غير متاحة حالياً`);
      return;
    }
    setLoading(true);
    setError('');
    setAdvice(null);
    setStyleImage('');
    try {
      if (mode === 'advice') {
        setAdvice(await requestGroomingAdvice({
          question: question.trim(),
          siteContext,
        }));
      } else {
        setStyleImage(await requestStyleImage(question.trim()));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'الخدمة غير متاحة';
      if (message.includes('تسجيل الدخول')) {
        navigate('login', { redirectScreen: 'ai-advisor' });
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const providerReady = mode === 'advice'
    ? capabilities.generativeAdvice
    : capabilities.hairstyleImageGeneration && !imagePaused;
  const canSubmit = providerReady && isLoggedIn && !(mode === 'image' && imagePaused);

  const handleBack = () => {
    if (activeTab === 'ai-hub' && prevTab) {
      setActiveTab(prevTab);
      return;
    }
    goBack();
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="sticky top-0 z-20 p-4 flex items-center gap-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button type="button" onClick={handleBack} aria-label="رجوع" className="w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowRight size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <div>
          <h1 className="font-bold flex items-center gap-2" style={{ color: themeConfig.colors.text }}><Sparkles size={17} style={{ color: themeConfig.colors.accent }} /> مساعد حلاقي</h1>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>مساعد Hallaqi — نصائح عناية… وأي سؤال بأسلوب حلاقي ذكي</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {!authReady ? (
          <div className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: themeConfig.colors.surface }} />
        ) : needsLogin ? (
          <div className="rounded-2xl border p-4" style={{ backgroundColor: `${themeConfig.colors.info}12`, borderColor: themeConfig.colors.border }}>
            <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>سجّل الدخول لاستخدام المساعد</p>
            <p className="text-[11px] mt-1 leading-5" style={{ color: themeConfig.colors.textMuted }}>
              النصائح المجانية عبر Groq متاحة بعد تسجيل الدخول لحماية الحصص اليومية.
            </p>
            <button
              type="button"
              onClick={() => navigate('login', { redirectScreen: 'ai-advisor' })}
              className="mt-3 w-full h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              <LogIn size={14} /> تسجيل الدخول
            </button>
          </div>
        ) : (
          <div className="rounded-xl px-3 py-2 flex items-center gap-2 text-[11px]" style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.textMuted }}>
            <MapPin size={13} style={{ color: themeConfig.colors.primary }} />
            <span>{contextLabel}{(siteContext.topBarbers?.length ?? 0) > 0 ? ` · ${siteContext.topBarbers!.length} حلاق مقترح` : ''}</span>
          </div>
        )}

        {galleryHandoff && (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: themeConfig.colors.border }}>
            <img src={galleryHandoff} alt="صورة من المعرض" className="w-full max-h-48 object-cover" />
            <div className="px-3 py-2 flex items-center justify-between gap-2" style={{ backgroundColor: themeConfig.colors.surface }}>
              <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.text }}>صورة محفوظة من المعرض</p>
              <button
                type="button"
                className="text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ color: themeConfig.colors.error, backgroundColor: `${themeConfig.colors.error}12` }}
                onClick={() => {
                  clearGalleryHandoff();
                  setGalleryHandoff('');
                }}
              >
                إزالة
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setMode('advice'); setError(''); }} className="h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2" style={{ backgroundColor: mode === 'advice' ? themeConfig.colors.primary : themeConfig.colors.surface, color: mode === 'advice' ? '#fff' : themeConfig.colors.text }}><WandSparkles size={15} /> نصيحة عناية</button>
          <button type="button" onClick={() => { setMode('image'); setError(''); setAdvice(null); }} className="h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2" style={{ backgroundColor: mode === 'image' ? themeConfig.colors.primary : themeConfig.colors.surface, color: mode === 'image' ? '#fff' : themeConfig.colors.text }}><Image size={15} /> تصور تسريحة</button>
        </div>

        {mode === 'image' && (
          imagePaused ? (
            <PausedFeatureBanner
              title="توليد صور التسريحات"
              description="متوقف حالياً بسبب حصة Gemini. استخدم تبويب «نصيحة عناية» للنصائح النصية عبر Groq."
              kind="paused"
              colors={themeConfig.colors}
            />
          ) : null
        )}

        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{mode === 'advice' || imagePaused ? 'ما النصيحة التي تحتاجها؟' : 'صف التسريحة المرجعية'}</p>
          <textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            maxLength={500}
            rows={5}
            disabled={mode === 'image' && imagePaused}
            placeholder={mode === 'advice' || imagePaused ? 'مثال: ما الخدمة المناسبة لشعر جاف ومجعد؟' : 'مثال: تسريحة قصيرة متدرجة لشعر مجعد، مرجع صالون واقعي'}
            className="w-full mt-3 rounded-xl border p-3 text-sm resize-none disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
          />
          {!providerReady && mode === 'advice' && (
            <p className="text-[11px] mt-2 p-2 rounded-lg" style={{ color: themeConfig.colors.warning, backgroundColor: themeConfig.colors.warning + '10' }}>
              {capabilities.externalBlocker || 'المساعد ينتظر إعداد مفتاح AI على الخادم (GROQ / XAI / Gemini).'}
            </p>
          )}
          {providerReady && capabilities.provider === 'groq' && (
            <p className="text-[11px] mt-2" style={{ color: themeConfig.colors.textMuted }}>
              يعرف سياسات Hallaqi والحلاقين على المنصة. حد يومي لحماية الخدمة.
            </p>
          )}
          {providerReady && capabilities.provider === 'gemini' && (
            <p className="text-[11px] mt-2" style={{ color: themeConfig.colors.textMuted }}>
              يعمل عبر Gemini مباشرة.
            </p>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit || loading || question.trim().length < 5}
            className="w-full h-11 rounded-xl mt-3 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-45"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            <Send size={15} />
            {loading
              ? 'جاري المعالجة...'
              : !isLoggedIn
                ? 'سجّل الدخول للمتابعة'
                : mode === 'image' && imagePaused
                  ? PAUSED_LABEL
                  : mode === 'advice'
                    ? 'احصل على النصيحة'
                    : 'ولّد المرجع'}
          </button>
        </div>

        {mode === 'advice' && advice && (
          <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.primary }}>
            <p className="text-sm leading-relaxed" style={{ color: themeConfig.colors.text }}>{advice.answer}</p>
            {advice.suggestedServices.length > 0 && <div className="flex flex-wrap gap-1">{advice.suggestedServices.map(service => <span key={service} className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: themeConfig.colors.primary + '12', color: themeConfig.colors.primary }}>{service}</span>)}</div>}
            {advice.cautions.map(caution => <p key={caution} className="text-[10px]" style={{ color: themeConfig.colors.warning }}>• {caution}</p>)}
          </div>
        )}
        {mode === 'image' && styleImage && <img src={styleImage} alt="مرجع تسريحة مولد بالذكاء الاصطناعي" className="w-full rounded-2xl" loading="lazy" />}
        {error && <p role="alert" className="text-xs p-3 rounded-xl" style={{ color: themeConfig.colors.error, backgroundColor: themeConfig.colors.error + '10' }}>{error}</p>}

        <div className="rounded-2xl p-4" style={{ backgroundColor: themeConfig.colors.success + '0D' }}>
          <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>يعمل محلياً أيضاً</p>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>ترتيب الحلاقين المقترحين وأفضل أوقات الحجز يعملان بخوارزمية محلية قابلة للتفسير ولا يرسلان بياناتك إلى نموذج خارجي.</p>
        </div>
      </main>
    </div>
  );
}
