import { useState, useEffect } from 'react';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useApp } from '@/contexts/useApp';
import { SkeletonBookingCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import BrandLogo from '@/components/BrandLogo';
import { useI18n } from '@/hooks/useI18n';
import { translate } from '@/lib/i18n';
import { motion } from 'framer-motion';
import type { Booking, BookingStatus } from '@/types';
import {
  getOrCreateConversation,
} from '@/supabase/database';
import { ReviewCommunityService } from '@/lib/community';
import ShareExperienceWatcher from '@/components/community/ShareExperienceWatcher';
import BarberStudioHub from '@/components/barber/BarberStudioHub';
import { CANCEL_POLICY } from '@/lib/cancelPolicy';
import {
  CalendarDays, Clock, MapPin, Car, CreditCard,
  CheckCircle2, XCircle, AlertCircle, MessageSquare,
  Star, Navigation, LogIn, ArrowRight
} from 'lucide-react';

const statusConfig: Record<BookingStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'بانتظار قبول الحلاق', color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
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
  const { bookings, themeConfig, settings, cancelBooking, navigate, setActiveTab, isLoading, refreshData } = useApp();
  const { isAuthenticated, isLoading: authLoading, needsLogin, appUser } = useAuthGate();
  const { money } = useI18n();
  const [activeFilter, setActiveFilter] = useState('upcoming');
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [forceClientAppointments, setForceClientAppointments] = useState(() => {
    try { return sessionStorage.getItem('hallaqi-force-client-appointments') === '1'; } catch { return false; }
  });

  const isProfessional = appUser?.user_role === 'barber' || appUser?.user_role === 'specialist';

  useEffect(() => {
    if (!forceClientAppointments) return;
    try { sessionStorage.removeItem('hallaqi-force-client-appointments'); } catch { /* ignore */ }
  }, [forceClientAppointments]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} />
      </div>
    );
  }

  if (isAuthenticated && isProfessional && appUser && !forceClientAppointments) {
    return <BarberStudioHub proId={appUser.id} />;
  }

  const openChatWith = async (otherId: string, name: string, avatar?: string) => {
    if (!appUser) return;
    try {
      const conversationId = await getOrCreateConversation(appUser.id, otherId);
      navigate('chat-room', { conversationId, participantName: name, participantAvatar: avatar, participantId: otherId });
    } catch { /* ignore */ }
  };

  const submitReview = async () => {
    if (!appUser || !reviewBooking) return;
    setIsReviewing(true);
    setReviewError('');
    try {
      await ReviewCommunityService.submitReview({
        booking_id: reviewBooking.id,
        reviewer_id: appUser.id,
        professional_id: reviewBooking.barberId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      await refreshData();
      setReviewBooking(null);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'تعذر إرسال التقييم');
    } finally {
      setIsReviewing(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (activeFilter === 'upcoming') return ['pending', 'confirmed'].includes(b.status);
    if (activeFilter === 'past') return b.status === 'completed';
    if (activeFilter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  // Show skeleton while loading
  const showSkeletons = isLoading.bookings && bookings.length === 0;

  // If not authenticated, show login prompt
  if (needsLogin) {
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
          <button
            type="button"
            onClick={() => setActiveTab('booking')}
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            aria-label="رجوع للحجز"
          >
            <ArrowRight size={18} style={{ color: themeConfig.colors.text }} />
          </button>
          <BrandLogo className="w-9 h-9 shadow-sm" priority />
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight" style={{ color: themeConfig.colors.text }}>{translate(settings.language, 'myAppointments')}</h1>
            <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{translate(settings.language, 'appointmentsDescription')}</p>
          </div>
          {isProfessional && forceClientAppointments && (
            <button
              type="button"
              onClick={() => setForceClientAppointments(false)}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl border"
              style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.primary, backgroundColor: themeConfig.colors.surface }}
            >
              استوديو الحلاق
            </button>
          )}
        </div>
        {isProfessional && forceClientAppointments && (
          <p className="text-[10px] mb-2 px-1" style={{ color: themeConfig.colors.textMuted }}>
            تعرض مواعيدك كزبون (طلباتك أنت) — وليس حجوزات زبائن صالونك.
          </p>
        )}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: activeFilter === tab.key ? themeConfig.colors.primary : themeConfig.colors.surface,
                color: activeFilter === tab.key ? '#fff' : themeConfig.colors.textMuted,
                border: `1px solid ${activeFilter === tab.key ? themeConfig.colors.primary : themeConfig.colors.border}`,
              }}>
              {tab.key === 'upcoming'
                ? translate(settings.language, 'upcoming')
                : tab.key === 'past'
                  ? translate(settings.language, 'previous')
                  : translate(settings.language, 'cancelled')}
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
                        <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{booking.date || '—'}</span>
                        <Clock size={11} style={{ color: themeConfig.colors.textMuted }} />
                        <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
                          {booking.time
                            || (booking.status === 'pending'
                              ? ({ morning: 'صباحاً', afternoon: 'بعد الظهر', evening: 'مساءً', any: 'أي وقت' }[booking.preferredTimeOfDay || 'any'] || 'بانتظار تحديد الوقت')
                              : '—')}
                        </span>
                      </div>
                      {booking.status === 'pending' && !booking.timeSetByBarber && (
                        <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.warning }}>
                          الحلاق سيتصل بك لتحديد الساعة
                        </p>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{money(booking.totalPrice)}</p>
                      {booking.discountAmount && <span className="text-[9px] font-medium text-green-600">وفرت {money(booking.discountAmount)}</span>}
                      {booking.paymentStatus === 'paid' && <span className="text-[10px] font-medium text-green-500">مدفوع</span>}
                      {booking.paymentStatus === 'pending' && <span className="text-[10px] font-medium text-amber-500">قيد الدفع</span>}
                    </div>
                  </div>

                  {/* Services */}
                  <div className="space-y-1.5 mb-3">
                    {booking.services.map(svc => (
                      <div key={svc.id} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: themeConfig.colors.textMuted }}>{svc.name}</span>
                        <span className="text-xs font-medium" style={{ color: themeConfig.colors.text }}>{money(svc.price)}</span>
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
                        <button onClick={() => openChatWith(booking.barberId, booking.barberName, booking.barberAvatar)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all"
                          style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}>
                          <MessageSquare size={14} /> تواصل
                        </button>
                        <button onClick={() => openDirections(booking.location)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all"
                          style={{ backgroundColor: themeConfig.colors.success + '10', color: themeConfig.colors.success }}>
                          <Navigation size={14} /> الاتجاهات
                        </button>
                        <button onClick={() => {
                          if (window.confirm(CANCEL_POLICY.confirmAr(booking.barberName))) void cancelBooking(booking.id);
                        }}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all"
                          style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}>
                          <XCircle size={14} /> إلغاء
                        </button>
                      </>
                    )}
                    {booking.status === 'completed' && !booking.reviewed && (
                      <button onClick={() => setReviewBooking(booking)} className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all"
                        style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                        <Star size={14} /> تقييم
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <button onClick={() => navigate('booking-flow', { barberId: booking.barberId, serviceIds: booking.services.map(service => service.id).join(','), preferredTime: booking.time })}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all"
                        style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}>
                        <CalendarDays size={14} /> حجز مجدداً
                      </button>
                    )}
                    {booking.status === 'cancelled' && (
                      <button onClick={() => navigate('booking-flow', { barberId: booking.barberId, serviceIds: booking.services.map(service => service.id).join(','), preferredTime: booking.time })}
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
          onAction={activeFilter === 'upcoming' ? () => { setActiveTab('booking'); navigate('home'); } : undefined}
          themeConfig={themeConfig}
        />
      )}

      {reviewBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5" onClick={() => setReviewBooking(null)}>
          <div
            className="w-full max-w-sm rounded-2xl p-5"
            style={{ backgroundColor: themeConfig.colors.surface }}
            onClick={event => event.stopPropagation()}
          >
            <h2 className="font-bold" style={{ color: themeConfig.colors.text }}>قيّم {reviewBooking.barberName}</h2>
            <div className="flex justify-center gap-2 my-5" dir="ltr">
              {[1, 2, 3, 4, 5].map(value => (
                <button key={value} type="button" onClick={() => setReviewRating(value)} aria-label={`${value} نجوم`}>
                  <Star size={30} fill={value <= reviewRating ? '#F59E0B' : 'transparent'} color="#F59E0B" />
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={event => setReviewComment(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="اكتب تعليقاً اختيارياً"
              className="w-full rounded-xl border p-3 text-sm resize-none"
              style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
            />
            {reviewError && <p role="alert" className="text-xs mt-2" style={{ color: themeConfig.colors.error }}>{reviewError}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setReviewBooking(null)} className="flex-1 h-10 rounded-xl border text-xs font-bold" style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}>إلغاء</button>
              <button type="button" onClick={() => void submitReview()} disabled={isReviewing} className="flex-1 h-10 rounded-xl text-white text-xs font-bold disabled:opacity-50" style={{ backgroundColor: themeConfig.colors.primary }}>
                {isReviewing ? 'جاري الإرسال...' : 'إرسال التقييم'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ShareExperienceWatcher />
    </div>
  );
}
