import { useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import type { TabName } from '@/types';
import { motion } from 'framer-motion';
import {
  Scissors,
  MessageSquare,
  User,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { translate, type TranslationKey } from '@/lib/i18n';
import AiRadialMenu from '@/components/nav/AiRadialMenu';
import { useLongPress } from '@/hooks/useLongPress';

const tabs: { key: TabName; labelKey: TranslationKey; icon: typeof Scissors; special?: boolean }[] = [
  { key: 'booking', labelKey: 'booking', icon: Scissors },
  { key: 'forum', labelKey: 'forum', icon: MessageSquare },
  { key: 'ai-hub', labelKey: 'assistant', icon: Sparkles, special: true },
  { key: 'marketplace', labelKey: 'marketplace', icon: ShoppingBag },
  { key: 'profile', labelKey: 'profile', icon: User },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, themeConfig, unreadCount, navigate, settings } = useApp();
  const { isAuthenticated } = useAuth();
  const [radialOpen, setRadialOpen] = useState(false);

  const openRadial = useCallback(() => setRadialOpen(true), []);
  const longPress = useLongPress(openRadial);

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.key === 'ai-hub') {
      // Single tap → AI assistant (core behavior)
      setActiveTab('ai-hub');
      navigate('ai-advisor');
      return;
    }
    setActiveTab(tab.key);
  };

  return (
    <>
      <nav
        aria-label="التنقل الرئيسي"
        className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl"
        style={{
          backgroundColor: `${themeConfig.colors.surface}dd`,
          borderColor: themeConfig.colors.border,
        }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key || (tab.key === 'ai-hub' && false);
            const Icon = tab.icon;
            const label = translate(settings.language, tab.labelKey);

            if (tab.special) {
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-label={`${label} — اضغط للذكاء الاصطناعي، اضغط مطولاً للإجراءات السريعة`}
                  className="relative flex flex-col items-center justify-center w-16 h-14 -mt-5"
                  onPointerDown={longPress.onPointerDown}
                  onPointerUp={longPress.onPointerUp}
                  onPointerLeave={longPress.onPointerLeave}
                  onPointerCancel={longPress.onPointerCancel}
                  onClick={() => {
                    if (longPress.didLongPress()) return;
                    handleTabClick(tab);
                  }}
                >
                  <motion.div
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4"
                    style={{
                      background: `linear-gradient(145deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})`,
                      borderColor: themeConfig.colors.surface,
                    }}
                    whileTap={{ scale: 0.92 }}
                    animate={{ scale: longPress.pressed ? 1.08 : 1 }}
                  >
                    <Sparkles size={24} className="text-white" />
                  </motion.div>
                  <span
                    className="text-[10px] mt-1 font-bold"
                    style={{ color: themeConfig.colors.primary }}
                  >
                    {label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab)}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300"
                style={{
                  backgroundColor: isActive ? `${themeConfig.colors.primary}12` : 'transparent',
                  transform: isActive ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute inset-0 rounded-2xl"
                    style={{ backgroundColor: `${themeConfig.colors.primary}08` }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-0.5 w-6 h-1 rounded-full"
                    style={{ backgroundColor: themeConfig.colors.primary }}
                    transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                  />
                )}

                <div className="relative">
                  <Icon
                    size={isActive ? 24 : 22}
                    style={{
                      color: isActive ? themeConfig.colors.primary : themeConfig.colors.textMuted,
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                  {tab.key === 'profile' && unreadCount > 0 && (
                    <span
                      className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                      style={{ backgroundColor: themeConfig.colors.error }}
                    >
                      {unreadCount}
                    </span>
                  )}
                  {tab.key === 'profile' && !isAuthenticated && (
                    <span
                      className="absolute -top-2 -right-2 w-3.5 h-3.5 flex items-center justify-center rounded-full text-[7px] font-bold text-white"
                      style={{ backgroundColor: themeConfig.colors.warning }}
                    >
                      !
                    </span>
                  )}
                </div>

                <span
                  className="text-[10px] mt-0.5 font-bold transition-colors duration-300"
                  style={{
                    color: isActive ? themeConfig.colors.primary : themeConfig.colors.textMuted,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="h-safe-area-inset-bottom" />
      </nav>

      <AiRadialMenu
        open={radialOpen}
        onClose={() => setRadialOpen(false)}
        onSelect={(action) => {
          if (action === 'ai') {
            setActiveTab('ai-hub');
            navigate('ai-advisor');
          } else if (action === 'qr') {
            setActiveTab('ai-hub');
            navigate('ai-hub-tool', { tool: 'qr' });
          } else if (action === 'camera') {
            setActiveTab('ai-hub');
            navigate('ai-hub-tool', { tool: 'camera' });
          } else {
            setActiveTab('ai-hub');
            navigate('ai-hub-tool', { tool: 'gallery' });
          }
        }}
      />
    </>
  );
}
