import { useState } from 'react';
import { ArrowLeft, Wand2, Loader2, Copy, Check, Lock } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { supabase } from '@/supabase/client';
import { canAccessAiListingTools } from '@/lib/marketplace/planAccess';
import type { MarketplacePlanTier } from '@/types/marketplace';

type ToolKind =
  | 'title'
  | 'seo'
  | 'keywords'
  | 'service'
  | 'category'
  | 'offer'
  | 'caption';

const TOOLS: { id: ToolKind; label: string; placeholder: string }[] = [
  { id: 'title', label: 'عنوان منتج', placeholder: 'زيت لحية طبيعي بأرغان...' },
  { id: 'seo', label: 'وصف SEO', placeholder: 'منتج عناية باللحية للرجال في الجزائر...' },
  { id: 'keywords', label: 'كلمات مفتاحية', placeholder: 'لحية، زيت، أرغان...' },
  { id: 'service', label: 'وصف خدمة', placeholder: 'عناية VIP باللحية في الصالون...' },
  { id: 'category', label: 'اقتراح فئة', placeholder: 'ماكينة حلاقة احترافية...' },
  { id: 'offer', label: 'نص عرض', placeholder: 'عرض ظهور مميز لهذا الأسبوع...' },
  { id: 'caption', label: 'تعليق صورة', placeholder: 'صورة منتج على خلفية رخامية...' },
];

export default function AiListingToolsPage() {
  const { themeConfig, goBack, screenParams } = useApp();
  const planId = (screenParams?.plan as MarketplacePlanTier) || 'basic';
  const unlocked = canAccessAiListingTools(planId);
  const [tool, setTool] = useState<ToolKind>('title');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const generate = async () => {
    if (!unlocked || !input.trim()) return;
    setLoading(true);
    setCopied(false);
    setUsedFallback(false);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('auth required');
      const res = await fetch('/api/ai/listing-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tool, prompt: input.trim() }),
      });
      if (res.status === 401) throw new Error('auth required');
      if (res.status === 429) {
        setOutput('وصلت للحد اليومي للمساعد. جرّب غداً أو استخدم الاقتراح المحلي.');
        setUsedFallback(true);
        return;
      }
      if (!res.ok) throw new Error('ai unavailable');
      const payload = await res.json() as { text?: string; fallback?: boolean };
      setOutput(payload.text || localFallback(tool, input));
      setUsedFallback(Boolean(payload.fallback));
    } catch {
      setOutput(localFallback(tool, input));
      setUsedFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }} aria-label="رجوع">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-black flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
          <Wand2 size={16} /> أدوات AI للقوائم
        </h1>
      </div>

      <p className="text-xs mb-3" style={{ color: themeConfig.colors.textMuted }}>
        يساعد البائع على كتابة العناوين والأوصاف — لا يستبدل نموذج العمل ولا ينشئ عمولات.
      </p>

      {!unlocked && (
        <div className="rounded-2xl border p-3 mb-3 flex gap-2" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <Lock size={14} style={{ color: themeConfig.colors.accent }} />
          <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>
            أدوات AI متاحة من الخطة الأساسية فما فوق — المستويات تفتح رؤى وأدوات وليس فقط كمية القوائم.
          </p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
        {TOOLS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            disabled={!unlocked}
            className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold disabled:opacity-50"
            style={{
              backgroundColor: tool === t.id ? themeConfig.colors.primary : themeConfig.colors.surface,
              color: tool === t.id ? '#fff' : themeConfig.colors.textMuted,
              border: `1px solid ${themeConfig.colors.border}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={4}
        placeholder={TOOLS.find(t => t.id === tool)?.placeholder}
        disabled={!unlocked}
        className="w-full rounded-2xl p-3 text-sm outline-none border disabled:opacity-50"
        style={{ backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.text, borderColor: themeConfig.colors.border }}
      />

      <button
        type="button"
        disabled={!unlocked || loading || !input.trim()}
        onClick={() => void generate()}
        className="w-full mt-3 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ backgroundColor: themeConfig.colors.primary, opacity: loading ? 0.7 : 1 }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
        توليد
      </button>

      {output && (
        <div className="mt-4 rounded-2xl border p-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold" style={{ color: themeConfig.colors.textMuted }}>
              {usedFallback ? 'وضع احتياطي (بدون مفتاح Gemini)' : 'نتيجة AI'}
            </span>
            <button type="button" onClick={() => void copy()} className="text-xs font-bold inline-flex items-center gap-1" style={{ color: themeConfig.colors.primary }}>
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'تم النسخ' : 'نسخ'}
            </button>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-7" style={{ color: themeConfig.colors.text }}>{output}</p>
        </div>
      )}
    </div>
  );
}

function localFallback(tool: ToolKind, prompt: string): string {
  const clean = prompt.trim();
  switch (tool) {
    case 'title':
      return `${clean} — جودة صالون احترافية | توصيل الجزائر`;
    case 'seo':
      return `${clean}. منتج مختار بعناية لعشاق العناية الشخصية في الجزائر. اكتشف التفاصيل على متجرنا الرسمي عبر Hallaqi.`;
    case 'keywords':
      return clean.split(/\s+/).slice(0, 8).concat(['عناية', 'جزائر', 'صالون', 'حلاق']).join('، ');
    case 'service':
      return `خدمة ${clean}: تجربة مريحة في الصالون مع اهتمام بالتفاصيل والنتيجة النهائية.`;
    case 'category':
      return 'اقتراح الفئة: أجهزة / أدوات احترافية (devices → professional_tools)';
    case 'offer':
      return `عرض ظهور مميز: ${clean} — موضع إعلاني لفترة محدودة، ليس خصماً عشوائياً.`;
    case 'caption':
      return `لقطة احترافية لـ ${clean} بإضاءة ناعمة تناسب كتالوج السوق.`;
    default:
      return clean;
  }
}
