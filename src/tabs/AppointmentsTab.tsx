import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { SkeletonBookingCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { motion } from 'framer-motion';
import type { BookingStatus } from '@/types';
import type { Database } from '@/types/supabase';
import { getProfessionalBookings, updateBookingStatus, sendNotification, getOrCreateConversation } from '@/supabase/database';
import {
  CalendarDays, Clock, MapPin, Car, CreditCard,
  CheckCircle2, XCircle, AlertCircle, MessageSquare,
  Star, Navigation, LogIn, User as UserIcon, Check, X, PlayCircle
} from 'lucide-react';

type DbBookingStatus = Database['public']['Enums']['booking_status'];

interface ProBookingRow {
  id: string;
  client_id: string | null;
  booking_start_time: string | null;
  total_price: number | null;
  notes: string | null;
  status: BookingStatus;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  services?: { name: string | null } | null;
}

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
  const { isAuthenticated, appUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState('upcoming');

  const isProfessional = appUser?.user_role === 'barber' || appUser?.user_role === 'specialist';
  if (isAuthenticated && isProfessional && appUser) {
    return <BarberAppointments proId={appUser.id} />;
  }

  const openChatWith = async (otherId: string, name: string, avatar?: string) => {
    if (!appUser) return;
    try {
      const conversationId = await getOrCreateConversation(appUser.id, otherId);
      navigate('chat-room', { conversationId, participantName: name, participantAvatar: avatar, participantId: otherId });
    } catch { /* ignore */ }
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

/* ================= BARBER VIEW: incoming bookings + accept/reject ================= */
const barberTabs: { key: BookingStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'طلبات جديدة' },
  { key: 'confirmed', label: 'مؤكدة' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'cancelled', label: 'ملغية' },
];

function BarberAppointments({ proId }: { proId: string }) {
  const { themeConfig, navigate } = useApp();
  const [rows, setRows] = useState<ProBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProfessionalBookings(proId);
      setRows(data as unknown as ProBookingRow[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [proId]);

  useEffect(() => { load(); }, [load]);

  const act = async (b: ProBookingRow, status: BookingStatus, clientMessage: string) => {
    setBusyId(b.id);
    try {
      await updateBookingStatus(b.id, status as unknown as DbBookingStatus);
      if (b.client_id) {
        try {
          await sendNotification({ userId: b.client_id, title: 'تحديث حالة الحجز', message: clientMessage, type: 'booking' });
        } catch { /* notification is best-effort */ }
      }
      await load();
    } catch {
      setBusyId(null);
      return;
    }
    setBusyId(null);
  };

  const shown = rows.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = rows.filter(r => r.status === 'pending').length;

  const fmt = (iso: string | null) => {
    if (!iso) return { date: '', time: '' };
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('ar-DZ', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 px-4 pt-3 pb-3 backdrop-blur-lg" style={{ backgroundColor: `${themeConfig.colors.background}ee` }}>
        <div className="flex items-center gap-2 mb-3">
          <img src="/logo-symbol.png" alt="Hallaqi" className="w-8 h-8 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: themeConfig.colors.text }}>حجوزات العملاء</h1>
            <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>إدارة طلبات الحجز الواردة</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {barberTabs.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className="flex-1 whitespace-nowrap py-2 px-2 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: filter === tab.key ? themeConfig.colors.primary : themeConfig.colors.surface,
                color: filter === tab.key ? '#fff' : themeConfig.colors.textMuted,
                border: `1px solid ${filter === tab.key ? themeConfig.colors.primary : themeConfig.colors.border}`,
              }}>
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 && (
                <span className="mr-1 px-1.5 py-0.5 rounded-full text-[9px]" style={{ backgroundColor: filter === tab.key ? '#ffffff30' : themeConfig.colors.primary + '15', color: filter === tab.key ? '#fff' : themeConfig.colors.primary }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3 mt-2">
        {loading ? (
          <><SkeletonBookingCard /><SkeletonBookingCard /></>
        ) : (
          shown.map((b, index) => {
            const status = statusConfig[b.status];
            const StatusIcon = status.icon;
            const { date, time } = fmt(b.booking_start_time);
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                className="rounded-2xl border overflow-hidden" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: status.bg }}>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon size={14} style={{ color: status.color }} />
                    <span className="text-xs font-bold" style={{ color: status.color }}>{status.label}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: status.color + '99' }}>{time} · {date}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {b.profiles?.avatar_url
                      ? <img src={b.profiles.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      : <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '15' }}><UserIcon size={22} style={{ color: themeConfig.colors.primary }} /></div>}
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-right" style={{ color: themeConfig.colors.text }}>{b.profiles?.full_name || 'عميل'}</h3>
                      <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{b.services?.name || 'خدمة'}</span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: themeConfig.colors.primary }}>{b.total_price ?? 0} دج</p>
                  </div>
                  {b.notes && (
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare size={12} style={{ color: themeConfig.colors.textMuted }} />
                      <span className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{b.notes}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-3 border-t" style={{ borderColor: themeConfig.colors.border }}>
                    {b.status === 'pending' && (
                      <>
                        <button disabled={busyId === b.id} onClick={() => act(b, 'confirmed', 'تم تأكيد حجزك من طرف الحلاق')}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold disabled:opacity-50"
                          style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}>
                          <Check size={14} /> قبول
                        </button>
                        <button disabled={busyId === b.id} onClick={() => act(b, 'cancelled', 'نعتذر، تم رفض طلب الحجز')}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold disabled:opacity-50"
                          style={{ backgroundColor: themeConfig.colors.error + '15', color: themeConfig.colors.error }}>
                          <X size={14} /> رفض
                        </button>
                      </>
                    )}
                    {b.status === 'confirmed' && (
                      <>
                        {b.client_id && (
                          <button onClick={async () => {
                            try {
                              const conversationId = await getOrCreateConversation(proId, b.client_id as string);
                              navigate('chat-room', { conversationId, participantName: b.profiles?.full_name || 'عميل', participantAvatar: b.profiles?.avatar_url || undefined, participantId: b.client_id as string });
                            } catch { /* ignore */ }
                          }}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold"
                            style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}>
                            <MessageSquare size={14} /> تواصل
                          </button>
                        )}
                        <button disabled={busyId === b.id} onClick={() => act(b, 'completed', 'تم إكمال موعدك. نتمنى أن تكون راضياً عن الخدمة!')}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold disabled:opacity-50"
                          style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}>
                          <PlayCircle size={14} /> إكمال
                        </button>
                      </>
                    )}
                    {(b.status === 'completed' || b.status === 'cancelled' || b.status === 'no_show') && (
                      <span className="text-[11px] w-full text-center py-1" style={{ color: themeConfig.colors.textMuted }}>لا توجد إجراءات</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        {!loading && shown.length === 0 && (
          <EmptyState icon={CalendarDays} title="لا توجد حجوزات" description="ستظهر هنا طلبات الحجز من العملاء" themeConfig={themeConfig} />
        )}
      </div>
    </div>
  );
}
