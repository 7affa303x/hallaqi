import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Images, Upload, X } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { clearGalleryHandoff, readGalleryHandoff, saveGalleryHandoff } from '@/lib/galleryHandoff';

const CameraTab = lazy(() => import('@/tabs/CameraTab'));

/**
 * Hosts QR / Camera / Gallery tools opened from the central AI radial menu.
 * Gallery preview persists in sessionStorage so it survives navigation.
 */
export default function AiHubToolPage() {
  const { themeConfig, screenParams, goBack, setActiveTab } = useApp();
  const tool = screenParams?.tool || 'qr';
  const fileRef = useRef<HTMLInputElement>(null);
  const [galleryPreview, setGalleryPreview] = useState<string | null>(() => readGalleryHandoff()?.dataUrl || null);
  const [galleryName, setGalleryName] = useState(() => readGalleryHandoff()?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = readGalleryHandoff();
    if (saved) {
      setGalleryPreview(saved.dataUrl);
      setGalleryName(saved.name);
    }
  }, []);

  const title = useMemo(() => {
    if (tool === 'camera') return 'الكاميرا';
    if (tool === 'gallery') return 'المعرض';
    return 'ماسح QR';
  }, [tool]);

  if (tool === 'qr' || tool === 'camera') {
    return (
      <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button type="button" onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeConfig.colors.surface }} aria-label="رجوع">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-black truncate" style={{ color: themeConfig.colors.text }}>{title}</h1>
          <button
            type="button"
            className="mr-auto text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: `${themeConfig.colors.primary}15`, color: themeConfig.colors.primary }}
            onClick={() => setActiveTab('ai-hub')}
          >
            فتح المساعد AI
          </button>
        </div>
        <Suspense fallback={<p className="text-center py-10" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>}>
          <CameraTab isActive />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-4 overflow-x-hidden" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeConfig.colors.surface }} aria-label="رجوع">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-black" style={{ color: themeConfig.colors.text }}>رفع من المعرض</h1>
      </div>

      <div
        className="rounded-3xl border-2 border-dashed p-8 flex flex-col items-center gap-3 text-center"
        style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}
      >
        <Images size={36} style={{ color: themeConfig.colors.primary }} />
        <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>اختر صورة من معرض جهازك</p>
        <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>تُحفظ مؤقتاً حتى تعود للمساعد — لن تختفي عند الرجوع</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="mt-2 px-4 py-2.5 rounded-2xl text-sm font-black text-white inline-flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: themeConfig.colors.primary }}
        >
          <Upload size={16} /> {busy ? 'جاري التحضير…' : 'اختيار صورة'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError('');
            void saveGalleryHandoff(file)
              .then(payload => {
                setGalleryPreview(payload.dataUrl);
                setGalleryName(payload.name);
              })
              .catch(err => setError(err instanceof Error ? err.message : 'تعذر حفظ الصورة'))
              .finally(() => setBusy(false));
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-center" style={{ color: themeConfig.colors.error }}>{error}</p>
      )}

      {galleryPreview && (
        <div className="mt-4 rounded-2xl overflow-hidden border" style={{ borderColor: themeConfig.colors.border }}>
          <div className="relative">
            <img src={galleryPreview} alt={galleryName || 'معاينة المعرض'} className="w-full max-h-80 object-cover" />
            <button
              type="button"
              aria-label="إزالة الصورة"
              className="absolute top-2 left-2 w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center"
              onClick={() => {
                clearGalleryHandoff();
                setGalleryPreview(null);
                setGalleryName('');
              }}
            >
              <X size={16} />
            </button>
          </div>
          <button
            type="button"
            className="w-full py-3 text-sm font-bold"
            style={{ backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.primary }}
            onClick={() => setActiveTab('ai-hub')}
          >
            متابعة مع مساعد AI
          </button>
        </div>
      )}
    </div>
  );
}
