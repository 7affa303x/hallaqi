import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Images, Upload } from 'lucide-react';
import { useApp } from '@/contexts/useApp';

const CameraTab = lazy(() => import('@/tabs/CameraTab'));

/**
 * Hosts QR / Camera / Gallery tools opened from the central AI radial menu.
 * Tap on the center button opens AI Advisor; long-press opens the radial menu.
 */
export default function AiHubToolPage() {
  const { themeConfig, screenParams, goBack, navigate } = useApp();
  const tool = screenParams?.tool || 'qr';
  const fileRef = useRef<HTMLInputElement>(null);
  const [galleryPreview, setGalleryPreview] = useState<string | null>(null);

  const title = useMemo(() => {
    if (tool === 'camera') return 'الكاميرا';
    if (tool === 'gallery') return 'المعرض';
    return 'ماسح QR';
  }, [tool]);

  if (tool === 'qr' || tool === 'camera') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button type="button" onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }} aria-label="رجوع">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-black" style={{ color: themeConfig.colors.text }}>{title}</h1>
          <button
            type="button"
            className="mr-auto text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: `${themeConfig.colors.primary}15`, color: themeConfig.colors.primary }}
            onClick={() => navigate('ai-advisor')}
          >
            فتح المساعد AI
          </button>
        </div>
        <Suspense fallback={<p className="text-center py-10" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>}>
          <CameraTab />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-4" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }} aria-label="رجوع">
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
        <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>لتحليل القصّة أو مشاركة منتج في السوق عبر المساعد</p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-2 px-4 py-2.5 rounded-2xl text-sm font-black text-white inline-flex items-center gap-2"
          style={{ backgroundColor: themeConfig.colors.primary }}
        >
          <Upload size={16} /> اختيار صورة
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            setGalleryPreview(url);
          }}
        />
      </div>

      {galleryPreview && (
        <div className="mt-4 rounded-2xl overflow-hidden border" style={{ borderColor: themeConfig.colors.border }}>
          <img src={galleryPreview} alt="معاينة المعرض" className="w-full max-h-80 object-cover" />
          <button
            type="button"
            className="w-full py-3 text-sm font-bold"
            style={{ backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.primary }}
            onClick={() => navigate('ai-advisor')}
          >
            متابعة مع مساعد AI
          </button>
        </div>
      )}
    </div>
  );
}
