import { useState } from 'react';
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
  Heart,
} from 'lucide-react';
import { translate, type TranslationKey } from '@/lib/i18n';
import AiRadialMenu from '@/components/nav/AiRadialMenu';
import HubSearchSheet from '@/components/nav/HubSearchSheet';
import { useLongPress } from '@/hooks/useLongPress';

const tabs: { key: TabName; labelKey: TranslationKey; icon: typeof Scissors; special?: boolean }[] = [
  { key: 'booking', labelKey: 'booking', icon: Scissors },
  { key: 'forum', labelKey: 'forum', icon: MessageSquare },
  { key: 'ai-hub', labelKey: 'assistant', icon: Sparkles, special: true },
  { key: 'marketplace', labelKey: 'marketplace', icon: ShoppingBag },
  { key: 'profile', labelKey: 'profile', icon: User },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, themeConfig, unreadCount, navigate, settings, screen } = useApp();
  const { isAuthenticated } = useAuth();
  const [radialOpen, setRadialOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSpecialTabLongPress = () => {
    setActiveTab('ai-hub');
  };

  const longPress = useLongPress(handleSpecialTabLongPress);

  const handleTabClick = (tab: typeof tabs[0]) => {
    setActiveTab(tab.key);
  };

  const handleSpecialTabClick = () => {
    setRadialOpen(true);
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
        <div data-mobile-shell className="flex items-center justify-around h-16 w-full max-w-none lg:max-w-lg lg:mx-auto relative">
          {tabs.map((tab) => {
            const isActive =
              activeTab === tab.key
              || (tab.key === 'booking' && activeTab === 'appointments')
              || (tab.key === 'ai-hub' && screen === 'ai-advisor');
            const Icon = tab.icon;
            const label = translate(settings.language, tab.labelKey);

            if (tab.special) {
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-label={`${label} — اضغط للقائمة السريعة، اضغط مطولاً للمساعد`}
                  className="relative flex flex-col items-center justify-center w-16 h-14 -mt-5"
                  onPointerDown={longPress.onPointerDown}
                  onPointerUp={longPress.onPointerUp}
                  onPointerLeave={longPress.onPointerLeave}
                  onPointerCancel={longPress.onPointerCancel}
                  onClick={() => {
                    if (longPress.didLongPress()) {
                      handleSpecialTabLongPress();
                    } else {
                      handleSpecialTabClick();
                    }
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
                    <span className="relative inline-flex items-center justify-center">
                      <Heart size={22} className="text-white fill-white/30" />
                      <Sparkles size={12} className="text-white absolute -top-1 -left-1" />
                    </span>
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
                  {tab.key === 'profile' && isAuthenticated && unreadCount > 0 && (
                    <span
                      className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                      style={{ backgroundColor: themeConfig.colors.error }}
                    >
                      {unreadCount}
                    </span>
                  )}
                  {/* No guest "!" badge — it looked like a real notification while Forum showed login. */}
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
            return;
          }
          if (action === 'search') {
            setSearchOpen(true);
            return;
          }
          if (action === 'qr') {
            navigate('ai-hub-tool', { tool: 'qr' });
            return;
          }
          if (action === 'camera') {
            navigate('ai-hub-tool', { tool: 'camera' });
            return;
          }
          if (action === 'gallery') {
            navigate('ai-hub-tool', { tool: 'gallery' });
            return;
          }
          if (action === 'missions') {
            navigate('missions');
            return;
          }
          if (action === 'referrals') {
            navigate('referrals');
            return;
          }
          if (action === 'achievements') {
            navigate('achievements');
            return;
          }
          navigate('rewards');
        }}
      />
      <HubSearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
