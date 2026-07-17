import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { ChevronLeft, ExternalLink, AlertTriangle } from 'lucide-react';

/**
 * In-app WebView for "Visit Store".
 * Uses iframe when the destination allows embedding; otherwise falls back to external browser.
 */
export default function StoreWebViewPage() {
  const { themeConfig, goBack, screenParams } = useApp();
  const rawUrl = screenParams?.url || '';
  const title = screenParams?.title || 'زيارة المتجر';
  const url = useMemo(() => {
    if (!rawUrl) return '';
    return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  }, [rawUrl]);
  const [blocked, setBlocked] = useState(false);

  const openExternal = () => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="shrink-0 border-b px-3 py-2 flex items-center gap-2"
        style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
        <button type="button" onClick={goBack} className="p-2 rounded-xl" aria-label="رجوع"
          style={{ backgroundColor: `${themeConfig.colors.primary}12` }}>
          <ChevronLeft size={18} style={{ color: themeConfig.colors.primary }} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: themeConfig.colors.text }}>{title}</p>
          <p className="text-[10px] truncate" style={{ color: themeConfig.colors.textMuted }}>{url}</p>
        </div>
        <button type="button" onClick={openExternal} className="p-2 rounded-xl" aria-label="فتح خارجي"
          style={{ backgroundColor: `${themeConfig.colors.accent}14` }}>
          <ExternalLink size={16} style={{ color: themeConfig.colors.accent }} />
        </button>
      </header>

      {!url ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p style={{ color: themeConfig.colors.textMuted }}>لا يوجد رابط متجر</p>
        </div>
      ) : blocked ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertTriangle size={28} style={{ color: themeConfig.colors.warning }} />
          <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
            هذا الموقع لا يدعم العرض داخل التطبيق
          </p>
          <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>
            سيتم فتحه في المتصفح الخارجي
          </p>
          <button type="button" onClick={openExternal}
            className="h-11 px-5 rounded-2xl text-sm font-bold text-white"
            style={{ backgroundColor: themeConfig.colors.primary }}>
            فتح في المتصفح
          </button>
        </div>
      ) : (
        <iframe
          title={title}
          src={url}
          className="flex-1 w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          onError={() => setBlocked(true)}
          onLoad={(e) => {
            // Some sites blank the iframe when denying framing; detect roughly.
            try {
              const doc = (e.target as HTMLIFrameElement).contentDocument;
              if (doc && doc.location.href === 'about:blank') setBlocked(true);
            } catch {
              // Cross-origin access denied is normal for successful embeds.
            }
          }}
        />
      )}
    </div>
  );
}
