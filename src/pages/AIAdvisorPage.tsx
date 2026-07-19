import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Image, LogIn, MapPin, Send, Sparkles, ThumbsDown, ThumbsUp, WandSparkles } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import PausedFeatureBanner from '@/components/PausedFeatureBanner';
import { FEATURE_FLAGS, PAUSED_LABEL } from '@/lib/featureFlags';
import { buildClientSiteContext } from '@/lib/ai/siteContext';
import { looksLikeMedicalQuestion, medicalRefusalMessage } from '@/lib/ai/medicalGuard';
import { aiAdviceExamples, AI_DAILY_QUOTA_HINT } from '@/lib/ai/adviceExamples';
import { translateApiError } from '@/lib/apiErrors';
import { trackProductEvent } from '@/lib/product-analytics';
import {
  getAICapabilities,
  requestGroomingAdvice,
  requestStyleImage,
  type AICapabilities,
  type GroomingAdvice,
} from '@/lib/ai/http';

const RATING_KEY = 'hallaqi-ai-advice-ratings-v1';

function readAdviceRating(fingerprint: string): 'up' | 'down' | null {
  try {
    const raw = localStorage.getItem(RATING_KEY);
    const map = raw ? JSON.parse(raw) as Record<string, 'up' | 'down'> : {};
    return map[fingerprint] || null;
  } catch {
    return null;
  }
}

function writeAdviceRating(fingerprint: string, value: 'up' | 'down') {
  try {
    const raw = localStorage.getItem(RATING_KEY);
    const map = raw ? JSON.parse(raw) as Record<string, 'up' | 'down'> : {};
    map[fingerprint] = value;
    localStorage.setItem(RATING_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

const fallbackCapabilities: AICapabilities = {
  deterministicRecommendations: true,
  optimizedScheduling: true,
  generativeAdvice: false,
  hairstyleImageGeneration: false,
  externalBlocker: 'المساعد ينتظر إعداد GROQ_API_KEY على الخادم.',
};

export default function AIAdvisorPage() {
  const { themeConfig, goBack, navigate, barbers, bookings, currentUser, settings } = useApp();
  const { isAuthenticated } = useAuth();
  const [capabilities, setCapabilities] = useState(fallbackCapabilities);
  const [mode, setMode] = useState<'advice' | 'image'>('advice');
  const [question, setQuestion] = useState('');
  const [advice, setAdvice] = useState<GroomingAdvice | null>(null);
  const [styleImage, setStyleImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  /** Short session memory — last 3 questions (#123) */
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    void getAICapabilities().then(setCapabilities).catch(() => {
      setCapabilities(fallbackCapabilities);
    });
  }, []);

  const imagePaused = !FEATURE_FLAGS.aiImageGenerationEnabled;
  const examples = useMemo(() => aiAdviceExamples(settings.language), [settings.language]);
  const quotaHint = AI_DAILY_QUOTA_HINT[settings.language] || AI_DAILY_QUOTA_HINT.ar;

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

  const suggestedBarbers = useMemo(() => {
    const hints = siteContext.topBarbers || [];
    return hints
      .map(h => barbers.find(b => b.id === h.id) || barbers.find(b => b.name === h.name))
      .filter((b): b is NonNullable<typeof b> => Boolean(b))
      .slice(0, 3);
  }, [siteContext.topBarbers, barbers]);

  const contextLabel = siteContext.wilaya
    ? `مرتبط بمنطقة ${siteContext.wilaya}`
    : 'مرتبط بمنصة حلاقي';

  const submit = async () => {
    if (question.trim().length < 5) return;
    if (!isAuthenticated) {
      setError('يجب تسجيل الدخول لاستخدام المساعد الذكي');
      navigate('login', { redirectScreen: 'ai-advisor' });
      return;
    }
    if (mode === 'image' && imagePaused) {
      setError(`توليد صور التسريحات ${PAUSED_LABEL} — حصة Gemini غير متاحة حالياً`);
      return;
    }
    const q = question.trim();
    if (mode === 'advice' && looksLikeMedicalQuestion(q)) {
      setAdvice(null);
      setStyleImage('');
      setError(medicalRefusalMessage(settings.language));
      setRecentQuestions(prev => [q, ...prev.filter(x => x !== q)].slice(0, 3));
      return;
    }
    setLoading(true);
    setError('');
    setAdvice(null);
    setStyleImage('');
    setRating(null);
    try {
      if (mode === 'advice') {
        setAdvice(await requestGroomingAdvice({
          question: q,
          siteContext,
        }));
        setRecentQuestions(prev => [q, ...prev.filter(x => x !== q)].slice(0, 3));
      } else {
        setStyleImage(await requestStyleImage(q));
      }
    } catch (err) {
      const message = translateApiError(err, settings.language);
      if (message.includes('تسجيل الدخول') || message.includes('Sign in') || message.includes('Connectez')) {
        navigate('login', { redirectScreen: 'ai-advisor' });
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const rateAdvice = (value: 'up' | 'down') => {
    if (!advice) return;
    const fp = `${question.slice(0, 40)}::${advice.answer.slice(0, 40)}`;
    writeAdviceRating(fp, value);
    setRating(value);
    trackProductEvent('AI Advice Rated', { helpful: value === 'up' });
  };

  useEffect(() => {
    if (!advice) return;
    const fp = `${question.slice(0, 40)}::${advice.answer.slice(0, 40)}`;
    setRating(readAdviceRating(fp));
  }, [advice, question]);

  const providerReady = mode === 'advice'
    ? capabilities.generativeAdvice
    : capabilities.hairstyleImageGeneration && !imagePaused;
  const canSubmit = providerReady && isAuthenticated && !(mode === 'image' && imagePaused);

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="sticky top-0 z-20 p-4 flex items-center gap-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button type="button" onClick={goBack} aria-label="رجوع" className="w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowRight size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <div>
          <h1 className="font-bold flex items-center gap-2" style={{ color: themeConfig.colors.text }}><Sparkles size={17} style={{ color: themeConfig.colors.accent }} /> مساعد حلاقي</h1>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>مساعد Hallaqi — نصائح عناية مرتبطة بالمنصة والحلاقين</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {!isAuthenticated && (
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
        )}

        {isAuthenticated && (
          <div className="rounded-xl px-3 py-2 flex items-center gap-2 text-[11px]" style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.textMuted }}>
            <MapPin size={13} style={{ color: themeConfig.colors.primary }} />
            <span>{contextLabel}{(siteContext.topBarbers?.length ?? 0) > 0 ? ` · ${siteContext.topBarbers!.length} حلاق مقترح` : ''}</span>
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

        {mode === 'advice' && (
          <div className="flex flex-wrap gap-2">
            {examples.map(ex => (
              <button
                key={ex}
                type="button"
                onClick={() => setQuestion(ex)}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border"
                style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.primary, backgroundColor: themeConfig.colors.surface }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {recentQuestions.length > 0 && mode === 'advice' && (
          <div className="flex flex-wrap gap-2">
            {recentQuestions.map(rq => (
              <button
                key={rq}
                type="button"
                onClick={() => setQuestion(rq)}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border max-w-full truncate"
                style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted, backgroundColor: themeConfig.colors.surface }}
              >
                {rq}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{mode === 'advice' || imagePaused ? 'ما النصيحة التي تحتاجها؟' : 'صف التسريحة المرجعية'}</p>
          <textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            maxLength={500}
            rows={5}
            disabled={mode === 'image' && imagePaused}
            placeholder={examples[0]}
            className="w-full mt-3 rounded-xl border p-3 text-sm resize-none disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
          />
          {!providerReady && mode === 'advice' && (
            <p className="text-[11px] mt-2 p-2 rounded-lg" style={{ color: themeConfig.colors.warning, backgroundColor: themeConfig.colors.warning + '10' }}>
              {capabilities.externalBlocker || 'المساعد ينتظر إعداد GROQ_API_KEY (مجاني) على الخادم.'}
            </p>
          )}
          {providerReady && mode === 'advice' && (
            <p className="text-[11px] mt-2" style={{ color: themeConfig.colors.textMuted }}>
              {quotaHint}
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
              : !isAuthenticated
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
            {suggestedBarbers.length > 0 && (
              <div className="pt-2 border-t space-y-2" style={{ borderColor: themeConfig.colors.border }}>
                <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.text }}>حلاقون على المنصة</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedBarbers.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => navigate('barber-detail', { barberId: b.id })}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border"
                      style={{ borderColor: themeConfig.colors.primary + '40', color: themeConfig.colors.primary, backgroundColor: themeConfig.colors.primary + '10' }}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>هل كانت مفيدة؟</span>
              <button type="button" aria-label="مفيدة" onClick={() => rateAdvice('up')} className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ borderColor: rating === 'up' ? themeConfig.colors.success : themeConfig.colors.border, color: rating === 'up' ? themeConfig.colors.success : themeConfig.colors.textMuted }}>
                <ThumbsUp size={14} />
              </button>
              <button type="button" aria-label="غير مفيدة" onClick={() => rateAdvice('down')} className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ borderColor: rating === 'down' ? themeConfig.colors.error : themeConfig.colors.border, color: rating === 'down' ? themeConfig.colors.error : themeConfig.colors.textMuted }}>
                <ThumbsDown size={14} />
              </button>
            </div>
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
