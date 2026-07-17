import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useApp } from '@/contexts/useApp';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const { themeConfig } = useApp();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

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
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setVisible(false);
    if (choice.outcome === 'dismissed') {
      localStorage.setItem('hallaqi-install-dismissed', 'true');
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[80] max-w-md mx-auto p-3 rounded-2xl border shadow-xl flex items-center gap-3" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.primary + '40' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '12' }}><Download size={19} style={{ color: themeConfig.colors.primary }} /></div>
      <div className="flex-1"><p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>ثبّت Hallaqi</p><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>وصول أسرع وتجربة أفضل على الهاتف</p></div>
      <button onClick={() => void install()} className="px-3 h-9 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>تثبيت</button>
      <button onClick={() => { localStorage.setItem('hallaqi-install-dismissed', 'true'); setVisible(false); }} aria-label="إغلاق" className="w-7 h-7 flex items-center justify-center"><X size={15} style={{ color: themeConfig.colors.textMuted }} /></button>
    </div>
  );
}
