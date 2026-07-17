import { useEffect, useState } from 'react';
import { ArrowRight, Image, Send, Sparkles, WandSparkles } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
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
  externalBlocker: 'AI Gateway must be enabled with budgets and model access.',
};

export default function AIAdvisorPage() {
  const { themeConfig, goBack } = useApp();
  const [capabilities, setCapabilities] = useState(fallbackCapabilities);
  const [mode, setMode] = useState<'advice' | 'image'>('advice');
  const [question, setQuestion] = useState('');
  const [advice, setAdvice] = useState<GroomingAdvice | null>(null);
  const [styleImage, setStyleImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getAICapabilities().then(setCapabilities).catch(() => {
      setCapabilities(fallbackCapabilities);
    });
  }, []);

  const submit = async () => {
    if (question.trim().length < 5) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'advice') {
        setAdvice(await requestGroomingAdvice({ question: question.trim() }));
      } else {
        setStyleImage(await requestStyleImage(question.trim()));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'الخدمة غير متاحة');
    } finally {
      setLoading(false);
    }
  };

  const enabled = mode === 'advice'
    ? capabilities.generativeAdvice
    : capabilities.hairstyleImageGeneration;

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="sticky top-0 z-20 p-4 flex items-center gap-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button type="button" onClick={goBack} aria-label="رجوع" className="w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowRight size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <div>
          <h1 className="font-bold flex items-center gap-2" style={{ color: themeConfig.colors.text }}><Sparkles size={17} style={{ color: themeConfig.colors.accent }} /> مساعد حلاقي</h1>
          <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>نصائح آمنة ومزايا ذكية قابلة للتفسير</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode('advice')} className="h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2" style={{ backgroundColor: mode === 'advice' ? themeConfig.colors.primary : themeConfig.colors.surface, color: mode === 'advice' ? '#fff' : themeConfig.colors.text }}><WandSparkles size={15} /> نصيحة عناية</button>
          <button type="button" onClick={() => setMode('image')} className="h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2" style={{ backgroundColor: mode === 'image' ? themeConfig.colors.primary : themeConfig.colors.surface, color: mode === 'image' ? '#fff' : themeConfig.colors.text }}><Image size={15} /> تصور تسريحة</button>
        </div>

        <div className="rounded-2xl border p-4" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{mode === 'advice' ? 'ما النصيحة التي تحتاجها؟' : 'صف التسريحة المرجعية'}</p>
          <textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            maxLength={600}
            rows={5}
            placeholder={mode === 'advice' ? 'مثال: ما الخدمة المناسبة لشعر جاف ومجعد؟' : 'مثال: تسريحة قصيرة متدرجة لشعر مجعد، مرجع صالون واقعي'}
            className="w-full mt-3 rounded-xl border p-3 text-sm resize-none"
            style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
          />
          {!enabled && (
            <p className="text-[11px] mt-2 p-2 rounded-lg" style={{ color: themeConfig.colors.warning, backgroundColor: themeConfig.colors.warning + '10' }}>
              {capabilities.externalBlocker || 'المساعد التوليدي ينتظر إعداد GEMINI_API_KEY على الخادم.'}
            </p>
          )}
          {enabled && capabilities.provider === 'gemini' && (
            <p className="text-[11px] mt-2" style={{ color: themeConfig.colors.textMuted }}>
              يعمل عبر Gemini مباشرة.
            </p>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!enabled || loading || question.trim().length < 5}
            className="w-full h-11 rounded-xl mt-3 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-45"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            <Send size={15} />
            {loading ? 'جاري المعالجة...' : mode === 'advice' ? 'احصل على النصيحة' : 'ولّد المرجع'}
          </button>
        </div>

        {advice && (
          <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.primary }}>
            <p className="text-sm leading-relaxed" style={{ color: themeConfig.colors.text }}>{advice.answer}</p>
            {advice.suggestedServices.length > 0 && <div className="flex flex-wrap gap-1">{advice.suggestedServices.map(service => <span key={service} className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: themeConfig.colors.primary + '12', color: themeConfig.colors.primary }}>{service}</span>)}</div>}
            {advice.cautions.map(caution => <p key={caution} className="text-[10px]" style={{ color: themeConfig.colors.warning }}>• {caution}</p>)}
          </div>
        )}
        {styleImage && <img src={styleImage} alt="مرجع تسريحة مولد بالذكاء الاصطناعي" className="w-full rounded-2xl" />}
        {error && <p role="alert" className="text-xs p-3 rounded-xl" style={{ color: themeConfig.colors.error, backgroundColor: themeConfig.colors.error + '10' }}>{error}</p>}

        <div className="rounded-2xl p-4" style={{ backgroundColor: themeConfig.colors.success + '0D' }}>
          <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>يعمل بدون مزود خارجي الآن</p>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>ترتيب الحلاقين المقترحين وأفضل أوقات الحجز يعملان بخوارزمية محلية قابلة للتفسير ولا يرسلان بياناتك إلى نموذج خارجي.</p>
        </div>
      </main>
    </div>
  );
}
