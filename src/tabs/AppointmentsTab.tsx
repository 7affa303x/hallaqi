import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { SkeletonBookingCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { motion } from 'framer-motion';
import type { BookingStatus } from '@/types';
import {
  CalendarDays, Clock, MapPin, Car, CreditCard,
  CheckCircle2, XCircle, AlertCircle, MessageSquare,
  Star, Navigation, LogIn
} from 'lucide-react';

const statusConfig: Record<BookingStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'قيد الانتظار', color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
  in_progress: { label: 'قيد التنفيذ', color: '#8B5CF6', bg: '#EDE9FE', icon: Clock },
  confirmed: { label: 'مؤكد', color: '#3B82F6', bg: '#DBEAFE', icon: CheckCircle2 },
  completed: { label: 'مكتمل', color: '#22C55E', bg: '#DCFCE7', icon: CheckCircle2 },
  cancelled: { label: 'ملغي', color: '#EF4444', bg: '#FEE2E2', icon: XCircle },
  'no_show': { label: 'لم يحضر', color: '#78716C', bg: '#F5F5F4', icon: AlertCircle },
};

const tabs = [
  { key: 'upcoming', label: 'القادمة' },
  { key: 'past', label: 'السابقة' },
  { key: 'cancelled', label: 'الملغية' },
];

const getPaymentLabel = (method?: string) => {
  switch (method) { case 'ccp': return 'CCP'; case 'baridi-mob': return 'بريدي موب'; case 'cash': return 'نقدي'; case 'card': return 'بطاقة'; default: return 'غير محدد'; }
};

/** Open Google Maps directions */
function openDirections(location: string) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`, '_blank');
}

export default function AppointmentsTab() {
  const { bookings, themeConfig, cancelBooking, navigate, isLoading } = useApp();
  const { isAuthenticated } = useAuth();
  const [activeFilter, setActiveFilter] = useState('upcoming');

  const filteredBookings = bookings.filter(b => {
    if (activeFilter === 'upcoming') return ['pending', 'confirmed'].includes(b.status);
    if (activeFilter === 'past') return b.status === 'completed';
    if (activeFilter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  // Show skeleton while loading
  const showSkeletons = isLoading.bookings && bookings.length === 0;

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="text-center max-w-xs">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: themeConfig.colors.primary + '15' }}
          >
            <CalendarDays size={36} style={{ color: themeConfig.colors.primary }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: themeConfig.colors.text }}>
            سجل الدخول لعرض مواعيدك
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
            قم بتسجيل الدخول لإدارة حجوزاتك ومواعيدك ومتابعتها
          </p>
          <button
            onClick={() => navigate('login')}
            className="w-full h-12 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            <LogIn size={18} />
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-3 pb-3 backdrop-blur-lg" style={{ backgroundColor: `${themeConfig.colors.background}ee` }}>
        <div className="flex items-center gap-2 mb-3">
          <img src="/logo-symbol.png" alt="Hallaqi" className="w-8 h-8 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: themeConfig.colors.text }}>مواعيدي</h1>
            <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>إدارة حجوزاتك والتواصل</p>
          </div>
        </div>
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: activeFilter === tab.key ? themeConfig.colors.primary : themeConfig.colors.surface,
                color: activeFilter === tab.key ? '#fff' : themeConfig.colors.textMuted,
                border: `1px solid ${activeFilter === tab.key ? themeConfig.colors.primary : themeConfig.colors.border}`,
              }}>
              {tab.label}
              {tab.key === 'upcoming' && (
                <span className="mr-1 px-1.5 py-0.5 rounded-full text-[9px]" style={{ backgroundColor: activeFilter === tab.key ? '#fff30' : themeConfig.colors.primary + '15', color: activeFilter === tab.key ? '#fff' : themeConfig.colors.primary }}>
                  {bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      <div className="px-4 space-y-3 mt-2">
        {showSkeletons ? (
          <>
            <SkeletonBookingCard />
            <SkeletonBookingCard />
            <SkeletonBookingCard />
          </>
        ) : (
          filteredBookings.map((booking, index) => {
            const status = statusConfig[booking.status];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
                className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
              >
                {/* Status Header */}
                <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: status.bg }}>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon size={14} style={{ color: status.color }} />
                    <span className="text-xs font-bold" style={{ color: status.color }}>{status.label}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: status.color + '99' }}>#{booking.id.toUpperCase()}</span>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Barber Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => navigate('barber-detail', { barberId: booking.barberId })}>
                      <img src={booking.barberAvatar} alt={booking.barberName} className="w-12 h-12 rounded-xl object-cover" />
                    </button>
                    <div className="flex-1">
                      <button onClick={() => navigate('barber-detail', { barberId: booking.barberId })}>
                        <h3 className="font-bold text-sm text-right" style={{ color: themeConfig.colors.text }}>{booking.barberName}</h3>
                      </button>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CalendarDays size={11} style={{ color: themeConfig.colors.textMuted }} />
                        <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{booking.date}</span>
                        <Clock size={11} style={{ color: themeConfig.colors.textMuted }} />
                        <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{booking.time}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{booking.totalPrice} دج</p>
                      {booking.paymentStatus === 'paid' && <span className="text-[10px] font-medium text-green-500">مدفوع</span>}
                      {booking.paymentStatus === 'pending' && <span className="text-[10px] font-medium text-amber-500">قيد الدفع</span>}
                    </div>
                  </div>

                  {/* Services */}
                  <div className="space-y-1.5 mb-3">
                    {booking.services.map(svc => (
                      <div key={svc.id} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{svc.name}</span>
                        <span className="text-xs font-medium" style={{ color: themeConfig.colors.text }}>{svc.price} دج</span>
                      </div>
                    ))}
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} style={{ color: themeConfig.colors.textMuted }} />
                      <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{booking.location}</span>
                    </div>
                    {booking.isMobileService && (
                      <div className="flex items-center gap-2">
                        <Car size={12} style={{ color: themeConfig.colors.info }} />
                        <span className="text-[11px] font-medium" style={{ color: themeConfig.colors.info }}>خدمة متنقلة</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CreditCard size={12} style={{ color: themeConfig.colors.textMuted }} />
                      <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{getPaymentLabel(booking.paymentMethod)}</span>
                    </div>
                    {booking.note && (
                      <div className="flex items-center gap-2">
                        <MessageSquare size={12} style={{ color: themeConfig.colors.textMuted }} />
                        <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>ملاحظة: {booking.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t" style={{ borderColor: themeConfig.colors.border }}>
                    {['pending', 'confirmed'].includes(booking.status) && (
                      <>
                        <button onClick={() => navigate('chat-room', { chatId: 'c1' })}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all"
                          style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}>
                          <MessageSquare size={14} /> تواصل
                        </button>
                        <button onClick={() => openDirections(booking.location)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all"
                          style={{ backgroundColor: themeConfig.colors.success + '10', color: themeConfig.colors.success }}>
                          <Navigation size={14} /> الاتجاهات
                        </button>
                        <button onClick={() => cancelBooking(booking.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all"
                          style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}>
                          <XCircle size={14} /> إلغاء
                        </button>
                      </>
                    )}
                    {booking.status === 'completed' && !booking.reviewed && (
                      <button className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all"
                        style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                        <Star size={14} /> تقييم
                      </button>
                    )}
                    {booking.status === 'cancelled' && (
                      <button onClick={() => navigate('booking-flow', { barberId: booking.barberId })}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all"
                        style={{ backgroundColor: themeConfig.colors.primary, color: '#fff' }}>
                        <CalendarDays size={14} /> إعادة الحجز
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {!showSkeletons && filteredBookings.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title={`لا توجد مواعيد ${activeFilter === 'upcoming' ? 'قادمة' : activeFilter === 'past' ? 'سابقة' : 'ملغية'}`}
          description={activeFilter === 'upcoming' ? 'احجز موعداً جديداً من صفحة الحجز' : 'ستظهر هنا عند وجودها'}
          actionLabel={activeFilter === 'upcoming' ? 'اكتشف الحلاقين' : undefined}
          onAction={activeFilter === 'upcoming' ? () => navigate('home') : undefined}
          themeConfig={themeConfig}
        />
      )}
    </div>
  );
}
