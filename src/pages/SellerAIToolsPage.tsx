import { useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { ChevronLeft, Sparkles, Wand2 } from 'lucide-react';

type AssistMode =
  | 'title'
  | 'description'
  | 'seo'
  | 'keywords'
  | 'service'
  | 'category'
  | 'caption'
  | 'offer';

const MODES: { id: AssistMode; label: string; hint: string }[] = [
  { id: 'title', label: 'عنوان منتج', hint: 'مثال: زيت لحية طبيعي' },
  { id: 'description', label: 'وصف منتج', hint: 'اذكر المزايا والجمهور' },
  { id: 'seo', label: 'نص SEO', hint: 'كلمات بحث جزائرية' },
  { id: 'keywords', label: 'كلمات مفتاحية', hint: 'افصل بأفكار قصيرة' },
  { id: 'service', label: 'وصف خدمة', hint: 'لعلاج أو خدمة إضافية عند الحلاق' },
  { id: 'category', label: 'اقتراح فئة', hint: 'صف المنتج لنقترح الفئة' },
  { id: 'caption', label: 'تعليق صورة', hint: 'صف محتوى الصورة' },
  { id: 'offer', label: 'نص عرض', hint: 'عرض ظهور مدفوع / منتج اليوم' },
];

export default function SellerAIToolsPage() {
  const { themeConfig, goBack } = useApp();
  const [mode, setMode] = useState<AssistMode>('title');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [soon, setSoon] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError('');
    setSoon(false);
    setOutput('');
    try {
      const res = await fetch('/api/ai/listing-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, prompt: input }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429 || res.status === 503 || data?.soon) {
          setSoon(true);
          setOutput(data?.text || 'المساعد جاهز هيكليًا — التوليد المباشر قريبًا عند توفر حصة AI.');
          return;
        }
        throw new Error(data?.error || 'تعذر التوليد');
      }
      setOutput(data.text || '');
    } catch (e) {
      setSoon(true);
      setError(e instanceof Error ? e.message : 'تعذر التوليد');
      setOutput('المساعد يساعد البائع ولا يستبدل نموذج العمل — قريبًا.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
        style={{ borderColor: themeConfig.colors.border, backgroundColor: `${themeConfig.colors.surface}ee` }}>
        <button type="button" onClick={goBack} className="p-2 rounded-xl" style={{ backgroundColor: `${themeConfig.colors.primary}12` }}>
          <ChevronLeft size={18} style={{ color: themeConfig.colors.primary }} />
        </button>
        <div>
          <h1 className="text-base font-black flex items-center gap-2" style={{ color: themeConfig.colors.text }}>
            <Wand2 size={16} /> أدوات AI للبائع
          </h1>
          <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>يساعد على القوائم — لا يستبدل نموذج العمل</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {MODES.map(m => (
            <button key={m.id} type="button" onClick={() => setMode(m.id)}
              className="shrink-0 px-3 h-8 rounded-full text-xs font-bold"
              style={{
                backgroundColor: mode === m.id ? themeConfig.colors.primary : `${themeConfig.colors.primary}12`,
                color: mode === m.id ? '#fff' : themeConfig.colors.primary,
              }}>{m.label}</button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={4}
          placeholder={MODES.find(m => m.id === mode)?.hint}
          className="w-full rounded-2xl border p-3 text-sm outline-none"
          style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.text }}
        />

        <button type="button" onClick={generate} disabled={loading || !input.trim()}
          className="w-full h-12 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: themeConfig.colors.primary }}>
          <Sparkles size={16} />
          {loading ? 'جاري التوليد...' : 'توليد اقتراح'}
        </button>

        {(output || soon || error) && (
          <div className="rounded-2xl border p-3 space-y-2" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
            {soon && (
              <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.accent }}>قريبًا · التوليد الكامل عند استقرار حصة Gemini</p>
            )}
            {error && <p className="text-xs" style={{ color: themeConfig.colors.error }}>{error}</p>}
            {output && <p className="text-sm leading-7 whitespace-pre-wrap" style={{ color: themeConfig.colors.text }}>{output}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
