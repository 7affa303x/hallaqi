import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useApp } from '@/contexts/useApp';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIosSafari(): boolean {
  try {
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    return iOS && !standalone;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const { themeConfig, settings } = useApp();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const visits = Number(localStorage.getItem('hallaqi-visits') || '0') + 1;
    localStorage.setItem('hallaqi-visits', String(visits));
    const dismissed = localStorage.getItem('hallaqi-install-dismissed') === 'true';
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      if (visits >= 2 && !dismissed) setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setVisible(false), { once: true });

    // #171 — Arabic/manual steps when native prompt is unavailable (e.g. iOS)
    if (!dismissed && visits >= 2 && isIosSafari()) {
      setManual(true);
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible) return null;
  if (!installEvent && !manual) return null;

  const dismiss = () => {
    localStorage.setItem('hallaqi-install-dismissed', 'true');
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setVisible(false);
    if (choice.outcome === 'dismissed') {
      localStorage.setItem('hallaqi-install-dismissed', 'true');
    }
  };

  const lang = settings.language;
  const title = lang === 'en' ? 'Install Hallaqi' : lang === 'fr' ? 'Installer Hallaqi' : 'ثبّت حلاقي';
  const bodyNative = lang === 'en'
    ? 'Faster access on your phone'
    : lang === 'fr'
      ? 'Accès plus rapide sur mobile'
      : 'وصول أسرع وتجربة أفضل على الهاتف';
  const bodyManual = lang === 'en'
    ? 'Safari → Share → Add to Home Screen'
    : lang === 'fr'
      ? 'Safari → Partager → Sur l’écran d’accueil'
      : 'Safari ← مشاركة ← إضافة إلى الشاشة الرئيسية';

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[80] max-w-md mx-auto p-3 rounded-2xl border shadow-xl flex items-center gap-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.primary + '40' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '12' }}><Download size={19} style={{ color: themeConfig.colors.primary }} /></div>
      <div className="flex-1">
        <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{title}</p>
        <p className="text-[10px] leading-4" style={{ color: themeConfig.colors.textMuted }}>{manual ? bodyManual : bodyNative}</p>
      </div>
      {installEvent && !manual && (
        <button onClick={() => void install()} className="px-3 h-9 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>
          {lang === 'en' ? 'Install' : lang === 'fr' ? 'Installer' : 'تثبيت'}
        </button>
      )}
      <button onClick={dismiss} aria-label="إغلاق" className="w-7 h-7 flex items-center justify-center"><X size={15} style={{ color: themeConfig.colors.textMuted }} /></button>
    </div>
  );
}
