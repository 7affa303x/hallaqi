import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { requestBarberAssist, type BarberAssistResult } from '@/lib/ai/http';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultQuestion?: string;
  context?: {
    clientName?: string;
    serviceName?: string;
    notes?: string;
  };
  onUseDraft?: (draft: string) => void;
}

export default function BarberAssistSheet({
  open,
  onClose,
  defaultQuestion = '',
  context,
  onUseDraft,
}: Props) {
  const { themeConfig } = useApp();
  const [question, setQuestion] = useState(defaultQuestion);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BarberAssistResult | null>(null);

  const submit = async (intent: 'client_brief' | 'message_draft' | 'free' = 'free') => {
    const q = question.trim() || defaultQuestion.trim();
    if (q.length < 3) return;
    setLoading(true);
    setError('');
    try {
      setResult(await requestBarberAssist({
        intent,
        question: q,
        context,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'المساعد غير متاح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[85] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="إغلاق" className="absolute inset-0 bg-black/45" onClick={onClose} />
          <motion.div
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="relative w-full max-w-lg rounded-t-3xl border-t p-4 pb-8 max-h-[88vh] overflow-y-auto"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: themeConfig.colors.accent }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>مساعد الحلاق</p>
                  <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>نصائح تشغيل · مسودة رسالة · ملخص عميل</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
                <X size={16} style={{ color: themeConfig.colors.textMuted }} />
              </button>
            </div>

            {(context?.clientName || context?.serviceName) && (
              <div className="mb-3 rounded-xl px-3 py-2 text-[11px]" style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.textMuted }}>
                {context.clientName && <span>العميل: {context.clientName} · </span>}
                {context.serviceName && <span>الخدمة: {context.serviceName}</span>}
              </div>
            )}

            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={3}
              placeholder="مثال: لخّص لي شو ندير لهذا العميل / اكتب رد مهذب"
              className="w-full rounded-xl border p-3 text-sm resize-none mb-2"
              style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
            />

            <div className="flex gap-2 mb-3">
              <button type="button" disabled={loading} onClick={() => void submit('client_brief')} className="flex-1 h-10 rounded-xl text-[11px] font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary + '14', color: themeConfig.colors.primary }}>ملخص العميل</button>
              <button type="button" disabled={loading} onClick={() => void submit('message_draft')} className="flex-1 h-10 rounded-xl text-[11px] font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary + '14', color: themeConfig.colors.primary }}>مسودة رسالة</button>
              <button type="button" disabled={loading} onClick={() => void submit('free')} className="flex-1 h-10 rounded-xl text-[11px] font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1" style={{ backgroundColor: themeConfig.colors.primary }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                اسأل
              </button>
            </div>

            {error && <p className="text-xs mb-2" style={{ color: themeConfig.colors.error }}>{error}</p>}

            {result && (
              <div className="rounded-2xl border p-3 space-y-2" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.background }}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: themeConfig.colors.text }}>{result.answer}</p>
                {result.suggestedActions?.length > 0 && (
                  <ul className="space-y-1">
                    {result.suggestedActions.map(action => (
                      <li key={action} className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>• {action}</li>
                    ))}
                  </ul>
                )}
                {result.messageDraft && (
                  <div className="pt-2 border-t space-y-2" style={{ borderColor: themeConfig.colors.border }}>
                    <p className="text-[11px] font-bold" style={{ color: themeConfig.colors.textMuted }}>مسودة جاهزة</p>
                    <p className="text-xs" style={{ color: themeConfig.colors.text }}>{result.messageDraft}</p>
                    {onUseDraft && (
                      <button
                        type="button"
                        onClick={() => {
                          onUseDraft(result.messageDraft!);
                          onClose();
                        }}
                        className="h-9 px-3 rounded-xl text-[11px] font-bold text-white"
                        style={{ backgroundColor: themeConfig.colors.primary }}
                      >
                        استخدم المسودة في الدردشة
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
