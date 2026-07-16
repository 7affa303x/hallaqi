import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import type { TabName } from '@/types';
import { motion } from 'framer-motion';
import {
  Scissors,
  CalendarDays,
  MessageSquare,
  User,
  Sparkles,
  QrCode
} from 'lucide-react';

const tabs: { key: TabName; label: string; icon: typeof Scissors; special?: boolean; authRequired?: boolean }[] = [
  { key: 'booking', label: 'الحجز', icon: Scissors },
  { key: 'appointments', label: 'المواعيد', icon: CalendarDays, authRequired: true },
  { key: 'camera', label: 'QR', icon: QrCode, special: true },
  { key: 'forum', label: 'المنتدى', icon: MessageSquare },
  { key: 'profile', label: 'البروفايل', icon: User },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, themeConfig, unreadCount, navigate, bookings } = useApp();
  const { isAuthenticated } = useAuth();

  const getTabBadge = (tab: typeof tabs[0]) => {
    if (tab.key === 'appointments') {
      // Only show badge if authenticated
      if (!isAuthenticated) return undefined;
      const count = bookings.filter(booking => ['pending', 'confirmed'].includes(booking.status)).length;
      return count > 0 ? count.toString() : undefined;
    }
    return undefined;
  };

  const handleTabClick = (tab: typeof tabs[0]) => {
    // If tab requires auth and user is not authenticated, redirect to login
    if (tab.authRequired && !isAuthenticated) {
      navigate('login', { redirectScreen: 'home', redirectTab: tab.key });
      return;
    }
    setActiveTab(tab.key);
  };

  return (
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
          const isActive = activeTab === tab.key;
          const badge = getTabBadge(tab);
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300"
              style={{
                backgroundColor: isActive ? `${themeConfig.colors.primary}12` : 'transparent',
                transform: isActive ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
              }}
            >
              {/* Active glow background */}
              {isActive && (
                <motion.div
                  layoutId="nav-glow"
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    backgroundColor: `${themeConfig.colors.primary}08`,
                  }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                />
              )}

              {/* Active top pill indicator */}
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
                {/* AI Sparkle for camera tab */}
                {tab.key === 'camera' && (
                  <Sparkles
                    size={10}
                    className="absolute -top-1 -left-2"
                    style={{ color: themeConfig.colors.accent }}
                  />
                )}
                {/* Badge */}
                {badge && (
                  <span
                    className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                    style={{ backgroundColor: themeConfig.colors.error }}
                  >
                    {badge}
                  </span>
                )}
                {/* Notifications badge for profile */}
                {tab.key === 'profile' && unreadCount > 0 && (
                  <span
                    className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                    style={{ backgroundColor: themeConfig.colors.error }}
                  >
                    {unreadCount}
                  </span>
                )}
                {/* Auth lock indicator for appointments */}
                {tab.authRequired && !isAuthenticated && (
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
                  color: isActive ? themeConfig.colors.primary : themeConfig.colors.textMuted
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}
