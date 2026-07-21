import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import type { ScreenName, TabName } from '@/types';

export type HubSearchTarget =
  | { kind: 'tab'; tab: TabName }
  | { kind: 'screen'; screen: ScreenName; params?: Record<string, string> }
  | { kind: 'profile-settings' }
  | { kind: 'logout' };

interface HubCommand {
  id: string;
  title: string;
  keywords: string;
  hint: string;
  target: HubSearchTarget;
}

const COMMANDS: HubCommand[] = [
  { id: 'ai', title: 'المساعد الذكي', keywords: 'ai مساعد نصيحة', hint: 'تبويب المساعد', target: { kind: 'tab', tab: 'ai-hub' } },
  { id: 'booking', title: 'الحجز', keywords: 'حجز حلاق موعد', hint: 'تبويب الحجز', target: { kind: 'tab', tab: 'booking' } },
  { id: 'appointments', title: 'المواعيد', keywords: 'مواعيد حجوزات استوديو', hint: 'مواعيدي / استوديو', target: { kind: 'tab', tab: 'appointments' } },
  { id: 'forum', title: 'المنتدى', keywords: 'منتدى منشورات تعليقات', hint: 'تبويب المنتدى', target: { kind: 'tab', tab: 'forum' } },
  { id: 'market', title: 'السوق', keywords: 'سوق منتجات متجر', hint: 'تبويب السوق', target: { kind: 'tab', tab: 'marketplace' } },
  { id: 'profile', title: 'البروفايل', keywords: 'بروفايل ملف شخصي إنجازات', hint: 'التقدم والإنجازات', target: { kind: 'tab', tab: 'profile' } },
  { id: 'settings', title: 'الإعدادات', keywords: 'إعدادات ثيم لغة إشعارات', hint: 'واجهة الإعدادات', target: { kind: 'profile-settings' } },
  { id: 'missions', title: 'المهمات', keywords: 'مهمات يومي أسبوعي شهري', hint: 'مهمات النمو', target: { kind: 'screen', screen: 'missions' } },
  { id: 'referrals', title: 'الدعوات', keywords: 'دعوة كود مشاركة', hint: 'كود الدعوة', target: { kind: 'screen', screen: 'referrals' } },
  { id: 'achievements', title: 'الإنجازات', keywords: 'شارات إنجازات badges', hint: 'شبكة الشارات', target: { kind: 'screen', screen: 'achievements' } },
  { id: 'rewards', title: 'المكافآت', keywords: 'مكافآت قريباً', hint: 'صفحة المكافآت', target: { kind: 'screen', screen: 'rewards' } },
  { id: 'messages', title: 'الرسائل', keywords: 'محادثات رسائل شات', hint: 'صندوق الرسائل', target: { kind: 'screen', screen: 'messages' } },
  { id: 'notifications', title: 'الإشعارات', keywords: 'إشعارات تنبيهات', hint: 'مركز الإشعارات', target: { kind: 'screen', screen: 'notifications' } },
  { id: 'camera', title: 'الكاميرا', keywords: 'كاميرا صورة', hint: 'أداة الكاميرا', target: { kind: 'screen', screen: 'ai-hub-tool', params: { tool: 'camera' } } },
  { id: 'qr', title: 'QR', keywords: 'qr سكانر باركود', hint: 'ماسح QR', target: { kind: 'screen', screen: 'ai-hub-tool', params: { tool: 'qr' } } },
  { id: 'gallery', title: 'المعرض', keywords: 'معرض صور gallery', hint: 'رفع من المعرض', target: { kind: 'screen', screen: 'ai-hub-tool', params: { tool: 'gallery' } } },
  { id: 'logout', title: 'تسجيل الخروج', keywords: 'خروج logout تسجيل الخروج', hint: 'من الإعدادات', target: { kind: 'logout' } },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Instant command finder for the assistant hub.
 * Better than dumping every destination into the radial ring.
 */
export default function HubSearchSheet({ open, onClose }: Props) {
  const { themeConfig, navigate, setActiveTab } = useApp();
  const { logout, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => {
      const hay = `${c.title} ${c.keywords} ${c.hint}`.toLowerCase();
      return hay.includes(q) || q.split(/\s+/).every(part => hay.includes(part));
    });
  }, [query]);

  const run = async (cmd: HubCommand) => {
    onClose();
    const t = cmd.target;
    if (t.kind === 'tab') {
      setActiveTab(t.tab);
      return;
    }
    if (t.kind === 'screen') {
      if ((t.screen === 'messages' || t.screen === 'notifications') && !isAuthenticated) {
        navigate('login', { redirectScreen: t.screen });
        return;
      }
      navigate(t.screen, t.params);
      return;
    }
    if (t.kind === 'profile-settings') {
      try { sessionStorage.setItem('hallaqi-profile-pane', 'settings'); } catch { /* ignore */ }
      setActiveTab('profile');
      return;
    }
    if (t.kind === 'logout') {
      if (!isAuthenticated) {
        navigate('login');
        return;
      }
      try { sessionStorage.setItem('hallaqi-profile-pane', 'settings'); } catch { /* ignore */ }
      setActiveTab('profile');
      // Soft confirm via settings bottom — or logout directly for search intent
      const ok = window.confirm('هل تريد تسجيل الخروج؟');
      if (ok) await logout();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center" dir="rtl">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="إغلاق البحث" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-t-3xl border-t p-4 pb-8 max-h-[78vh] flex flex-col"
        style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex-1 flex items-center gap-2 h-11 px-3 rounded-xl border"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            <Search size={16} style={{ color: themeConfig.colors.primary }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث: مواعيد، خروج، إعدادات…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: themeConfig.colors.text }}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            aria-label="إغلاق"
          >
            <X size={18} style={{ color: themeConfig.colors.text }} />
          </button>
        </div>

        <div className="overflow-y-auto space-y-1">
          {results.length === 0 && (
            <p className="text-center text-xs py-8" style={{ color: themeConfig.colors.textMuted }}>لا نتائج</p>
          )}
          {results.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => void run(cmd)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl text-right border"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>{cmd.title}</p>
                <p className="text-[10px] truncate" style={{ color: themeConfig.colors.textMuted }}>{cmd.hint}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
