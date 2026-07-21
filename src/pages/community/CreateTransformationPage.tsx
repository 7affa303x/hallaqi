import { useEffect, useState } from 'react';
import { ArrowRight, ImagePlus, Send, X } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { TransformationService } from '@/lib/community';
import { getProfessionalBookings } from '@/supabase/database';
import { uploadForumImage } from '@/supabase/storage';
import { assertFileWithinLimit, compressImageFile, UPLOAD_LIMITS } from '@/lib/imageUpload';

interface ClientOption {
  id: string;
  name: string;
  bookingId: string;
}

export default function CreateTransformationPage() {
  const { themeConfig, goBack } = useApp();
  const { appUser } = useAuth();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [caption, setCaption] = useState('');
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState('');
  const [afterPreview, setAfterPreview] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!appUser) return;
    getProfessionalBookings(appUser.id, ['completed'])
      .then(rows => {
        const seen = new Set<string>();
        const options: ClientOption[] = [];
        for (const row of rows) {
          const cid = row.client_id;
          if (!cid || seen.has(cid)) continue;
          seen.add(cid);
          const profile = row.profiles as { full_name?: string | null } | null;
          options.push({
            id: cid,
            name: profile?.full_name || 'عميل',
            bookingId: row.id,
          });
        }
        setClients(options);
        if (options[0]) setCustomerId(options[0].id);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل العملاء'));
  }, [appUser]);

  useEffect(() => () => {
    if (beforePreview) URL.revokeObjectURL(beforePreview);
    if (afterPreview) URL.revokeObjectURL(afterPreview);
  }, [beforePreview, afterPreview]);

  const pickImage = async (file: File | undefined, slot: 'before' | 'after') => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('اختر صورة JPG أو PNG أو WebP');
      return;
    }
    const limitError = assertFileWithinLimit(file, UPLOAD_LIMITS.forumImageMaxBytes);
    if (limitError) {
      setError(limitError);
      return;
    }
    const compressed = await compressImageFile(file, { maxBytes: UPLOAD_LIMITS.forumImageMaxBytes });
    if (slot === 'before') {
      if (beforePreview) URL.revokeObjectURL(beforePreview);
      setBeforeFile(compressed);
      setBeforePreview(URL.createObjectURL(compressed));
    } else {
      if (afterPreview) URL.revokeObjectURL(afterPreview);
      setAfterFile(compressed);
      setAfterPreview(URL.createObjectURL(compressed));
    }
    setError('');
  };

  const submit = async () => {
    if (!appUser || !customerId || !beforeFile || !afterFile) {
      setError('اختر العميل وصورتي قبل/بعد');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const [beforeUrl, afterUrl] = await Promise.all([
        uploadForumImage(appUser.id, beforeFile),
        uploadForumImage(appUser.id, afterFile),
      ]);
      if (!beforeUrl || !afterUrl) throw new Error('تعذر رفع الصور');

      await TransformationService.create({
        barberId: appUser.id,
        customerId,
        beforeImageUrl: beforeUrl,
        afterImageUrl: afterUrl,
        caption: caption.trim() || undefined,
        contestId: undefined,
      });
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء التحول');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: themeConfig.colors.background }} dir="rtl">
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 border-b"
        style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
      >
        <button type="button" onClick={goBack} aria-label="رجوع" className="w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowRight size={20} style={{ color: themeConfig.colors.text }} />
        </button>
        <div>
          <h1 className="font-bold" style={{ color: themeConfig.colors.text }}>تحول قبل/بعد</h1>
          <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
            العميل يوافق قبل النشر · يظهر في ملفيهما
          </p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div>
          <label htmlFor="transformation-client" className="text-xs font-bold block mb-2" style={{ color: themeConfig.colors.text }}>
            العميل
          </label>
          <select
            id="transformation-client"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            className="w-full h-12 rounded-xl border px-3 text-sm"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
          >
            {clients.length === 0 && <option value="">لا يوجد عملاء مكتملون</option>}
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['before', 'after'] as const).map(slot => {
            const preview = slot === 'before' ? beforePreview : afterPreview;
            const label = slot === 'before' ? 'قبل' : 'بعد';
            return preview ? (
              <div key={slot} className="relative rounded-2xl overflow-hidden">
                <img src={preview} alt={label} className="w-full aspect-square object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    if (slot === 'before') {
                      setBeforeFile(null);
                      setBeforePreview('');
                    } else {
                      setAfterFile(null);
                      setAfterPreview('');
                    }
                  }}
                  aria-label={`إزالة ${label}`}
                  className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X size={14} />
                </button>
                <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full">{label}</span>
              </div>
            ) : (
              <label
                key={slot}
                htmlFor={`transformation-${slot}`}
                className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
                style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
              >
                <ImagePlus size={20} />
                <span className="text-[10px] mt-1">{label}</span>
                <input
                  id={`transformation-${slot}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => void pickImage(e.target.files?.[0], slot)}
                />
              </label>
            );
          })}
        </div>

        <div>
          <label htmlFor="transformation-caption" className="text-xs font-bold block mb-2" style={{ color: themeConfig.colors.text }}>
            وصف (اختياري)
          </label>
          <textarea
            id="transformation-caption"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border p-3 text-sm resize-none"
            placeholder="صف التحول..."
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
          />
        </div>

        {error && (
          <p role="alert" className="text-xs rounded-xl p-3" style={{ color: themeConfig.colors.error, backgroundColor: themeConfig.colors.error + '10' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={submitting || !customerId || !beforeFile || !afterFile}
          onClick={() => void submit()}
          className="w-full h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: themeConfig.colors.primary }}
        >
          <Send size={16} />
          {submitting ? 'جاري الإرسال...' : 'إرسال للموافقة'}
        </button>
      </div>
    </div>
  );
}
