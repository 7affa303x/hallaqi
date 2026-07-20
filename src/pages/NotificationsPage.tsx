import { useApp } from '@/contexts/useApp';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import {
  ArrowLeft, Bell, MessageSquare, Calendar,
  Trophy, Tag, Info, CheckCheck, ChevronLeft
} from 'lucide-react';
import type { AppNotification } from '@/types';

const iconMap = {
  booking: Calendar,
  message: MessageSquare,
  forum: MessageSquare,
  promo: Tag,
  system: Info,
  competition: Trophy,
};

const colorMap = {
  booking: '#3B82F6',
  message: '#10B981',
  forum: '#8B5CF6',
  promo: '#F59E0B',
  system: '#6B7280',
  competition: '#EAB308',
};

export default function NotificationsPage() {
  const { themeConfig, notifications, markNotificationRead, markAllNotificationsRead, navigate, setActiveTab, goBack } = useApp();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const openNotification = async (notification: AppNotification) => {
    if (!notification.read) await markNotificationRead(notification.id);
    const action = notification.actionUrl;
    if (!action) return;
    if (action === '/appointments') {
      setActiveTab('appointments');
      navigate('home');
      return;
    }
    if (action.startsWith('/post/')) {
      navigate('post-detail', { postId: action.slice('/post/'.length) });
      return;
    }
    if (action.startsWith('/chat/')) {
      navigate('chat-room', { conversationId: action.slice('/chat/'.length) });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -300 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="min-h-screen pb-20"
      style={{ backgroundColor: themeConfig.colors.background }}
    >
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-lg border-b"
        style={{ backgroundColor: `${themeConfig.colors.background}ee`, borderColor: themeConfig.colors.border }}
      >
        <button onClick={goBack} aria-label="رجوع" className="w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowLeft size={22} style={{ color: themeConfig.colors.text }} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>الإشعارات</h1>
          <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>
            {unreadNotifications.length} إشعارات جديدة
          </p>
        </div>
        {unreadNotifications.length > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ color: themeConfig.colors.primary, backgroundColor: themeConfig.colors.primary + '10' }}
          >
            <CheckCheck size={14} />
            قراءة الكل
          </button>
        )}
      </div>

      {/* Unread */}
      {unreadNotifications.length > 0 && (
        <div className="px-4 mt-3">
          <h2 className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.primary }}>جديد</h2>
          <div className="space-y-2">
            {unreadNotifications.map(n => {
              const Icon = iconMap[n.type] || Bell;
              const color = colorMap[n.type] || themeConfig.colors.primary;
              return (
                <button
                  key={n.id}
                  onClick={() => void openNotification(n)}
                  className="w-full text-right p-3 rounded-xl border flex items-start gap-3"
                  style={{
                    backgroundColor: themeConfig.colors.surface,
                    borderColor: themeConfig.colors.border,
                    borderRight: `3px solid ${color}`,
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color + '15' }}
                  >
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{n.title}</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>{n.message}</p>
                    <p className="text-[10px] mt-1" style={{ color }}>{n.createdAt.split('T')[0]}</p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: color }} />
                  {n.actionUrl && <ChevronLeft size={15} style={{ color: themeConfig.colors.textMuted }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Read */}
      {readNotifications.length > 0 && (
        <div className="px-4 mt-4">
          <h2 className="text-xs font-bold mb-2" style={{ color: themeConfig.colors.textMuted }}>سابق</h2>
          <div className="space-y-2">
            {readNotifications.map(n => {
              const Icon = iconMap[n.type] || Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => void openNotification(n)}
                  className="w-full text-right p-3 rounded-xl border opacity-70 flex items-start gap-3"
                  style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: themeConfig.colors.textMuted + '10' }}
                  >
                    <Icon size={20} style={{ color: themeConfig.colors.textMuted }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{n.title}</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>{n.message}</p>
                    <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.textMuted }}>{n.createdAt.split('T')[0]}</p>
                  </div>
                  {n.actionUrl && <ChevronLeft size={15} style={{ color: themeConfig.colors.textMuted }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Bell size={48} style={{ color: themeConfig.colors.textMuted + '30' }} />
          <p className="mt-3 text-sm" style={{ color: themeConfig.colors.textMuted }}>لا توجد إشعارات</p>
        </div>
      )}
    </motion.div>
  );
}
