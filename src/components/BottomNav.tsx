import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import type { TabName } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Scissors,
  CalendarDays,
  MessageSquare,
  User,
  Sparkles,
  QrCode,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { translate, type TranslationKey } from '@/lib/i18n';

const sideTabs: { key: TabName; labelKey: TranslationKey; icon: typeof Scissors; authRequired?: boolean }[] = [
  { key: 'booking', labelKey: 'booking', icon: Scissors },
  { key: 'forum', labelKey: 'forum', icon: MessageSquare },
  { key: 'appointments', labelKey: 'appointments', icon: CalendarDays, authRequired: true },
  { key: 'profile', labelKey: 'profile', icon: User },
];

type RadialAction = 'ai' | 'qr' | 'camera' | 'gallery';

const LAST_RADIAL_KEY = 'hallaqi-last-radial';
const HAS_POTD_KEY = 'hallaqi-has-potd';

export default function BottomNav() {
  const { activeTab, setActiveTab, themeConfig, unreadCount, navigate, bookings, settings } = useApp();
  const { isAuthenticated } = useAuth();
  const [radialOpen, setRadialOpen] = useState(false);
  const [hasPotd, setHasPotd] = useState(() => {
    try {
      return localStorage.getItem(HAS_POTD_KEY) === '1';
    } catch {
      return false;
    }
  });
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    const sync = () => {
      try {
        setHasPotd(localStorage.getItem(HAS_POTD_KEY) === '1');
      } catch {
        setHasPotd(false);
      }
    };
    sync();
    window.addEventListener('storage', sync);
    const interval = window.setInterval(sync, 4000);
    return () => {
      window.removeEventListener('storage', sync);
      window.clearInterval(interval);
    };
  }, []);

  const getTabBadge = (tab: (typeof sideTabs)[0]) => {
    if (tab.key === 'appointments') {
      if (!isAuthenticated) return undefined;
      const count = bookings.filter(booking => ['pending', 'confirmed'].includes(booking.status)).length;
      return count > 0 ? count.toString() : undefined;
    }
    return undefined;
  };

  const handleTabClick = (tab: (typeof sideTabs)[0]) => {
    if (tab.authRequired && !isAuthenticated) {
      navigate('login', { redirectScreen: 'home', redirectTab: tab.key });
      return;
    }
    setRadialOpen(false);
    setActiveTab(tab.key);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onCenterPointerDown = () => {
    longPressTriggered.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
      setRadialOpen(true);
    }, 420);
  };

  const onCenterPointerUp = () => {
    clearLongPress();
    if (longPressTriggered.current) return;
    setRadialOpen(false);
    navigate('ai-advisor');
  };

  const runRadial = (action: RadialAction) => {
    setRadialOpen(false);
    try {
      localStorage.setItem(LAST_RADIAL_KEY, action);
    } catch {
      /* ignore */
    }
    if (action === 'ai') {
      navigate('ai-advisor');
      return;
    }
    if (action === 'qr') {
      setActiveTab('camera');
      navigate('home', { cameraMode: 'scanner' });
      return;
    }
    if (action === 'camera') {
      setActiveTab('camera');
      navigate('home', { cameraMode: 'camera' });
      return;
    }
    setActiveTab('camera');
    navigate('home', { cameraMode: 'gallery' });
  };

  const left = sideTabs.slice(0, 2);
  const right = sideTabs.slice(2);

  const radialItems: { id: RadialAction; label: string; icon: typeof Sparkles; angle: number }[] = [
    { id: 'ai', label: 'AI', icon: Sparkles, angle: -90 },
    { id: 'qr', label: 'QR', icon: QrCode, angle: -20 },
    { id: 'camera', label: translate(settings.language, 'camera'), icon: Camera, angle: 40 },
    { id: 'gallery', label: translate(settings.language, 'gallery'), icon: ImageIcon, angle: 100 },
  ];

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl"
      style={{
        backgroundColor: `${themeConfig.colors.surface}dd`,
        borderColor: themeConfig.colors.border,
      }}
    >
      <AnimatePresence>
        {radialOpen && (
          <>
            <motion.button
              type="button"
              aria-label="إغلاق القائمة"
              className="fixed inset-0 z-40 bg-black/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRadialOpen(false)}
            />
            <motion.div
              className="absolute inset-x-0 bottom-16 z-50 flex justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="relative w-56 h-40 pointer-events-auto">
                {radialItems.map(item => {
                  const rad = (item.angle * Math.PI) / 180;
                  const x = Math.cos(rad) * 72;
                  const y = Math.sin(rad) * 56;
                  const Icon = item.icon;
                  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1, x, y }}
                      exit={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 22 }}
                      onClick={() => runRadial(item.id)}
                      className="absolute left-1/2 top-1/2 -ml-7 -mt-7 w-14 h-14 rounded-full border flex flex-col items-center justify-center gap-0.5 shadow-lg"
                      style={{
                        backgroundColor: themeConfig.colors.surface,
                        borderColor: themeConfig.colors.border,
                        color: themeConfig.colors.primary,
                      }}
                      aria-label={item.label}
                    >
                      <Icon size={16} />
                      <span className="text-[9px] font-bold">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative px-1">
        {left.map(tab => {
          const isActive = activeTab === tab.key && !radialOpen;
          const badge = getTabBadge(tab);
          const Icon = tab.icon;
          const label = translate(settings.language, tab.labelKey);
          const showPotdSparkle = tab.key === 'booking' && hasPotd;
          return (
            <NavButton
              key={tab.key}
              label={label}
              isActive={isActive}
              badge={badge}
              Icon={Icon}
              theme={themeConfig}
              onClick={() => handleTabClick(tab)}
              authLocked={!!tab.authRequired && !isAuthenticated}
              sparkle={showPotdSparkle}
            />
          );
        })}

        {/* Central AI heart button */}
        <div className="relative -mt-7 z-50">
          <button
            type="button"
            aria-label={translate(settings.language, 'assistant')}
            aria-pressed={radialOpen}
            onPointerDown={onCenterPointerDown}
            onPointerUp={onCenterPointerUp}
            onPointerLeave={clearLongPress}
            onPointerCancel={clearLongPress}
            className="w-16 h-16 rounded-full flex flex-col items-center justify-center text-white shadow-xl border-4"
            style={{
              background: `linear-gradient(145deg, ${themeConfig.colors.primary}, ${themeConfig.colors.accent})`,
              borderColor: themeConfig.colors.surface,
              boxShadow: `0 10px 28px ${themeConfig.colors.primary}55`,
            }}
          >
            <Sparkles size={22} />
            <span className="text-[9px] font-black mt-0.5">AI</span>
          </button>
        </div>

        {right.map(tab => {
          const isActive = activeTab === tab.key && !radialOpen;
          const badge = getTabBadge(tab);
          const Icon = tab.icon;
          const label = translate(settings.language, tab.labelKey);
          const showUnread = tab.key === 'profile' && unreadCount > 0;
          return (
            <NavButton
              key={tab.key}
              label={label}
              isActive={isActive}
              badge={showUnread ? String(unreadCount) : badge}
              Icon={Icon}
              theme={themeConfig}
              onClick={() => handleTabClick(tab)}
              authLocked={!!tab.authRequired && !isAuthenticated}
            />
          );
        })}
      </div>

      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}

function NavButton({
  label,
  isActive,
  badge,
  Icon,
  theme,
  onClick,
  authLocked,
  sparkle,
}: {
  label: string;
  isActive: boolean;
  badge?: string;
  Icon: typeof Scissors;
  theme: { colors: Record<string, string> };
  onClick: () => void;
  authLocked?: boolean;
  sparkle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className="relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300"
      style={{
        backgroundColor: isActive ? `${theme.colors.primary}12` : 'transparent',
        transform: isActive ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
      }}
    >
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute -top-0.5 w-6 h-1 rounded-full"
          style={{ backgroundColor: theme.colors.primary }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        />
      )}
      <div className="relative">
        <Icon
          size={isActive ? 24 : 22}
          style={{ color: isActive ? theme.colors.primary : theme.colors.textMuted }}
          strokeWidth={isActive ? 2.5 : 1.5}
        />
        {sparkle && (
          <span
            className="absolute -top-1.5 -left-1.5"
            title="منتج اليوم متاح"
          >
            <Sparkles size={10} style={{ color: theme.colors.accent }} />
          </span>
        )}
        {badge && (
          <span
            className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
            style={{ backgroundColor: theme.colors.error }}
          >
            {badge}
          </span>
        )}
        {authLocked && (
          <span
            className="absolute -top-2 -right-2 w-3.5 h-3.5 flex items-center justify-center rounded-full text-[7px] font-bold text-white"
            style={{ backgroundColor: theme.colors.warning }}
          >
            !
          </span>
        )}
      </div>
      <span
        className="text-[10px] mt-0.5 font-bold"
        style={{ color: isActive ? theme.colors.primary : theme.colors.textMuted }}
      >
        {label}
      </span>
    </button>
  );
}
