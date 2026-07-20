import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, CheckCircle2, Clock, MessageSquare, PlayCircle, Plus, Sparkles,
  User as UserIcon, Wallet, X, XCircle, AlertCircle, CalendarDays, Phone,
} from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import BrandLogo from '@/components/BrandLogo';
import EmptyState from '@/components/EmptyState';
import { SkeletonBookingCard } from '@/components/Skeleton';
import BarberQuickEntry from '@/components/barber/BarberQuickEntry';
import BarberAssistSheet from '@/components/barber/BarberAssistSheet';
import {
  getProfessionalBookings,
  getProfessionalMetrics,
  updateBookingStatus,
  acceptBookingWithTime,
  getBookingClientPhone,
  sendNotification,
  getOrCreateConversation,
  sendMessage,
} from '@/supabase/database';
import { BARBER_MESSAGE_TEMPLATES, fillTemplate } from '@/lib/barber/messageTemplates';
import {
  computeDayStats,
  displayClientName,
  formatClock,
  formatDayLabel,
  serviceLabel,
  preferredPeriodLabel,
  requestDayLabel,
  bookingDurationMinutes,
  type StudioBooking,
} from '@/lib/barber/studioHelpers';
import type { BookingStatus } from '@/types';
import type { Database } from '@/types/supabase';

type DbBookingStatus = Database['public']['Enums']['booking_status'];

const ACCEPT_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
  '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
];

const barberTabs: { key: BookingStatus | 'all' | 'today'; label: string }[] = [
  { key: 'today', label: 'اليوم' },
  { key: 'pending', label: 'طلبات' },
  { key: 'confirmed', label: 'مؤكدة' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'cancelled', label: 'ملغية' },
];

const statusConfig: Record<BookingStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'طلب جديد', color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
  in_progress: { label: 'قيد التنفيذ', color: '#0EA5E9', bg: '#E0F2FE', icon: Clock },
  confirmed: { label: 'مؤكد', color: '#3B82F6', bg: '#DBEAFE', icon: CheckCircle2 },
  completed: { label: 'مكتمل', color: '#22C55E', bg: '#DCFCE7', icon: CheckCircle2 },
  cancelled: { label: 'ملغي', color: '#EF4444', bg: '#FEE2E2', icon: XCircle },
  no_show: { label: 'لم يحضر', color: '#78716C', bg: '#F5F5F4', icon: AlertCircle },
};

export default function BarberStudioHub({ proId }: { proId: string }) {
  const { themeConfig, navigate } = useApp();
  const [rows, setRows] = useState<StudioBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookingStatus | 'all' | 'today'>('pending');
  const [quickOpen, setQuickOpen] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistCtx, setAssistCtx] = useState<{ clientName?: string; serviceName?: string; notes?: string; question?: string }>({});
  const [templateFor, setTemplateFor] = useState<StudioBooking | null>(null);
  const [metrics, setMetrics] = useState({ average_response_minutes: 0, acceptance_rate: 0, completed_bookings: 0 });
  const [toast, setToast] = useState('');
  const [acceptFor, setAcceptFor] = useState<StudioBooking | null>(null);
  const [acceptDate, setAcceptDate] = useState('');
  const [acceptTime, setAcceptTime] = useState('');
  const [acceptError, setAcceptError] = useState('');
  const [clientPhones, setClientPhones] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, m] = await Promise.all([
        getProfessionalBookings(proId),
        getProfessionalMetrics(proId).catch(() => ({ average_response_minutes: 0, acceptance_rate: 0, completed_bookings: 0 })),
      ]);
      const mapped = data as unknown as StudioBooking[];
      setRows(mapped);
      setMetrics(m as typeof metrics);

      const pending = mapped.filter(r => r.status === 'pending' && r.client_id);
      const phones: Record<string, string> = {};
      await Promise.all(pending.map(async (row) => {
        try {
          const phone = await getBookingClientPhone(row.id);
          if (phone) phones[row.id] = phone;
        } catch { /* ignore */ }
      }));
      setClientPhones(phones);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [proId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => computeDayStats(rows), [rows]);

  const shown = useMemo(() => {
    if (filter === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      return rows
        .filter(r => {
          if (r.status === 'cancelled') return false;
          const raw = r.status === 'pending'
            ? (r.preferred_date || r.booking_start_time)
            : r.booking_start_time;
          if (!raw) return false;
          const iso = raw.includes('T') ? raw : `${raw}T12:00:00`;
          const t = new Date(iso).getTime();
          return t >= start.getTime() && t <= end.getTime();
        })
        .sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (b.status === 'pending' && a.status !== 'pending') return 1;
          return new Date(a.booking_start_time || 0).getTime() - new Date(b.booking_start_time || 0).getTime();
        });
    }
    return rows.filter(r => filter === 'all' || r.status === filter);
  }, [rows, filter]);

  const openAccept = (b: StudioBooking) => {
    const preferred = b.preferred_date
      || (b.booking_start_time ? b.booking_start_time.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setAcceptFor(b);
    setAcceptDate(preferred);
    setAcceptTime('');
    setAcceptError('');
  };

  const confirmAccept = async () => {
    if (!acceptFor) return;
    if (!acceptDate || !acceptTime) {
      setAcceptError('اختر اليوم والوقت بعد الاتصال بالزبون');
      return;
    }
    setBusyId(acceptFor.id);
    setAcceptError('');
    try {
      const startsAt = new Date(`${acceptDate}T${acceptTime}:00`).toISOString();
      await acceptBookingWithTime(acceptFor.id, startsAt);
      if (acceptFor.client_id) {
        try {
          await sendNotification({
            userId: acceptFor.client_id,
            title: 'تم تأكيد موعدك',
            message: `تم تحديد موعدك في ${acceptDate} الساعة ${acceptTime}. نراك قريباً!`,
            type: 'booking',
            metadata: { booking_id: acceptFor.id },
          });
        } catch { /* best-effort */ }
      }
      setAcceptFor(null);
      await load();
      setToast('تم قبول الطلب وتحديد الوقت');
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : 'تعذر قبول الطلب');
    } finally {
      setBusyId(null);
    }
  };

  const act = async (b: StudioBooking, status: BookingStatus, clientMessage: string) => {
    setBusyId(b.id);
    try {
      await updateBookingStatus(b.id, status as DbBookingStatus);
      if (b.client_id) {
        try {
          await sendNotification({
            userId: b.client_id,
            title: 'تحديث حالة الحجز',
            message: clientMessage,
            type: 'booking',
            metadata: { booking_id: b.id },
          });
        } catch { /* best-effort */ }
      }
      await load();
      setToast(status === 'completed' ? 'تم إكمال الموعد' : 'تم التحديث');
    } finally {
      setBusyId(null);
    }
  };

  const openChat = async (b: StudioBooking, preset?: string) => {
    if (!b.client_id) {
      setToast('هذا عميل مباشر بدون حساب في التطبيق');
      return;
    }
    try {
      const conversationId = await getOrCreateConversation(proId, b.client_id);
      if (preset) {
        try {
          await sendMessage({
            conversation_id: conversationId,
            sender_id: proId,
            content: preset,
            status: 'sent',
            type: 'text',
          });
        } catch { /* ignore preset send failure */ }
      }
      navigate('chat-room', {
        conversationId,
        participantName: displayClientName(b),
        participantAvatar: b.profiles?.avatar_url || undefined,
        participantId: b.client_id,
      });
    } catch {
      setToast('تعذر فتح المحادثة');
    }
  };

  const openAssist = (b?: StudioBooking) => {
    if (b) {
      setAssistCtx({
        clientName: displayClientName(b),
        serviceName: serviceLabel(b),
        notes: b.notes || undefined,
        question: b.notes
          ? `لخّص لي ماذا أحتاج أن أعرفه قبل خدمة هذا العميل`
          : `اقترح نصائح سريعة لهذه الخدمة: ${serviceLabel(b)}`,
      });
    } else {
      setAssistCtx({ question: 'كيف أنظّم يومي اليوم لأقلل الفجوات؟' });
    }
    setAssistOpen(true);
  };

  return (
    <div className="pb-28 relative">
      <div className="sticky top-0 z-30 px-4 pt-3 pb-3 backdrop-blur-lg" style={{ backgroundColor: `${themeConfig.colors.background}ee` }}>
        <div className="flex items-center gap-2 mb-3">
          <BrandLogo className="w-9 h-9 shadow-sm" priority />
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight" style={{ color: themeConfig.colors.text }}>استوديو العمل</h1>
            <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>{formatDayLabel()} · إدارة سلسة ليومك</p>
          </div>
          <button
            type="button"
            onClick={() => openAssist()}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: themeConfig.colors.primary + '14' }}
            aria-label="مساعد الحلاق"
          >
            <Sparkles size={18} style={{ color: themeConfig.colors.primary }} />
          </button>
        </div>

        <div
          className="rounded-2xl p-3 mb-3 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${themeConfig.colors.primary}18, ${themeConfig.colors.background} 55%, ${themeConfig.colors.accent}14)`,
            border: `1px solid ${themeConfig.colors.border}`,
          }}
        >
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>اليوم</p>
              <p className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>{stats.todayCount}</p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>مكتمل</p>
              <p className="text-lg font-bold" style={{ color: themeConfig.colors.success }}>{stats.completedCount}</p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>إيراد اليوم</p>
              <p className="text-lg font-bold" style={{ color: themeConfig.colors.primary }}>{stats.revenueToday}<span className="text-[10px] font-medium"> دج</span></p>
            </div>
          </div>

          {(stats.nowBooking || stats.nextBooking) ? (
            <div className="rounded-xl p-3" style={{ backgroundColor: themeConfig.colors.surface + 'cc' }}>
              {stats.nowBooking ? (
                <>
                  <p className="text-[10px] font-bold mb-1" style={{ color: themeConfig.colors.accent }}>الآن على الكرسي</p>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
                    {displayClientName(stats.nowBooking)} · {serviceLabel(stats.nowBooking)}
                  </p>
                  <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>
                    {formatClock(stats.nowBooking.booking_start_time)}
                    {stats.nowBooking.notes ? ` · ${stats.nowBooking.notes.replace(/\[عميل مباشر(?::[^\]]*)?\]\s*/g, '')}` : ''}
                  </p>
                </>
              ) : stats.nextBooking && (
                <>
                  <p className="text-[10px] font-bold mb-1" style={{ color: themeConfig.colors.primary }}>التالي</p>
                  <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
                    {displayClientName(stats.nextBooking)} · {formatClock(stats.nextBooking.booking_start_time)}
                  </p>
                  <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>{serviceLabel(stats.nextBooking)}</p>
                </>
              )}
            </div>
          ) : (
            <p className="text-[11px]" style={{ color: themeConfig.colors.textMuted }}>لا حجوزات نشطة الآن — استخدم الإدخال السريع لعميل مباشر.</p>
          )}

          <div className="flex gap-3 mt-3 text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
            <span>قبول {Math.round((metrics.acceptance_rate || 0) * 100)}%</span>
            <span>رد ≈ {Math.round(metrics.average_response_minutes || 0)} د</span>
            <span>مكتمل كلي {metrics.completed_bookings || 0}</span>
          </div>
        </div>

        {stats.gaps.length > 0 && filter === 'today' && (
          <div className="mb-3 rounded-xl px-3 py-2 text-[11px]" style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}>
            فجوة {stats.gaps[0].minutes} دقيقة بعد {displayClientName(stats.gaps[0].after)} — فرصة لعميل مباشر أو استراحة قصيرة.
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {barberTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="whitespace-nowrap py-2 px-3 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: filter === tab.key ? themeConfig.colors.primary : themeConfig.colors.surface,
                color: filter === tab.key ? '#fff' : themeConfig.colors.textMuted,
                border: `1px solid ${filter === tab.key ? themeConfig.colors.primary : themeConfig.colors.border}`,
              }}
            >
              {tab.label}
              {tab.key === 'pending' && stats.pendingCount > 0 && (
                <span className="mr-1 px-1.5 py-0.5 rounded-full text-[9px]" style={{ backgroundColor: filter === tab.key ? '#ffffff30' : themeConfig.colors.primary + '15', color: filter === tab.key ? '#fff' : themeConfig.colors.primary }}>
                  {stats.pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3 mt-2">
        {loading ? (
          <><SkeletonBookingCard /><SkeletonBookingCard /></>
        ) : shown.map((b, index) => {
          const status = statusConfig[b.status] || statusConfig.pending;
          const StatusIcon = status.icon;
          const name = displayClientName(b);
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.2) }}
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            >
              <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: status.bg }}>
                <div className="flex items-center gap-1.5">
                  <StatusIcon size={14} style={{ color: status.color }} />
                  <span className="text-xs font-bold" style={{ color: status.color }}>{status.label}</span>
                </div>
                <span className="text-[10px]" style={{ color: status.color + '99' }}>
                  {b.status === 'pending'
                    ? `${requestDayLabel(b)} · ${preferredPeriodLabel(b.preferred_time_of_day)}`
                    : formatClock(b.booking_start_time)}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {b.profiles?.avatar_url
                    ? <img src={b.profiles.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    : <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '15' }}><UserIcon size={22} style={{ color: themeConfig.colors.primary }} /></div>}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-right truncate" style={{ color: themeConfig.colors.text }}>{name}</h3>
                    <span className="text-[11px] block truncate" style={{ color: themeConfig.colors.textMuted }}>{serviceLabel(b)}</span>
                    {!b.client_id && (
                      <span className="text-[10px]" style={{ color: themeConfig.colors.accent }}>عميل مباشر</span>
                    )}
                    {b.status === 'pending' && (
                      <span className="text-[10px] block mt-0.5" style={{ color: themeConfig.colors.textMuted }}>
                        المدة التقريبية {bookingDurationMinutes(b)} د — الوقت يُحدَّد بعد الاتصال
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold shrink-0" style={{ color: themeConfig.colors.primary }}>{b.total_price ?? 0} دج</p>
                </div>

                {b.notes && (
                  <div className="flex items-start gap-2 mb-3 rounded-xl px-3 py-2" style={{ backgroundColor: themeConfig.colors.background }}>
                    <MessageSquare size={12} className="mt-0.5 shrink-0" style={{ color: themeConfig.colors.textMuted }} />
                    <span className="text-[11px] leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>{b.notes}</span>
                  </div>
                )}

                {b.status === 'pending' && clientPhones[b.id] && (
                  <a
                    href={`tel:${clientPhones[b.id]}`}
                    className="flex items-center justify-center gap-2 mb-3 h-10 rounded-xl text-xs font-bold"
                    style={{ backgroundColor: themeConfig.colors.primary + '12', color: themeConfig.colors.primary }}
                  >
                    <Phone size={14} />
                    اتصل بالزبون · {clientPhones[b.id]}
                  </a>
                )}

                <div className="flex gap-2 flex-wrap pt-3 border-t" style={{ borderColor: themeConfig.colors.border }}>
                  {b.status === 'pending' && (
                    <>
                      <button disabled={busyId === b.id} onClick={() => openAccept(b)}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold disabled:opacity-50"
                        style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}>
                        <Check size={14} /> قبول وتحديد الوقت
                      </button>
                      <button disabled={busyId === b.id} onClick={() => void act(b, 'cancelled', 'نعتذر، تم رفض طلب الحجز')}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold disabled:opacity-50"
                        style={{ backgroundColor: themeConfig.colors.error + '15', color: themeConfig.colors.error }}>
                        <X size={14} /> رفض
                      </button>
                    </>
                  )}
                  {(b.status === 'confirmed' || b.status === 'in_progress') && (
                    <>
                      {b.client_id && (
                        <button onClick={() => setTemplateFor(b)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold"
                          style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}>
                          <MessageSquare size={14} /> تواصل
                        </button>
                      )}
                      <button onClick={() => openAssist(b)}
                        className="h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1"
                        style={{ backgroundColor: themeConfig.colors.accent + '18', color: themeConfig.colors.accent }}>
                        <Sparkles size={14} /> AI
                      </button>
                      <button disabled={busyId === b.id} onClick={() => void act(b, 'completed', 'تم إكمال موعدك. نتمنى أن تكون راضياً عن الخدمة!')}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold disabled:opacity-50"
                        style={{ backgroundColor: themeConfig.colors.success + '15', color: themeConfig.colors.success }}>
                        <PlayCircle size={14} /> إكمال
                      </button>
                    </>
                  )}
                  {b.status === 'completed' && b.client_id && (
                    <button onClick={() => setTemplateFor(b)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}>
                      <MessageSquare size={14} /> متابعة
                    </button>
                  )}
                  {(b.status === 'cancelled' || b.status === 'no_show') && (
                    <span className="text-[11px] w-full text-center py-1" style={{ color: themeConfig.colors.textMuted }}>لا توجد إجراءات</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {!loading && shown.length === 0 && (
          <EmptyState icon={CalendarDays} title="لا توجد حجوزات هنا" description="اضغط + لتسجيل عميل مباشر أو انتظر طلبات الحجز" themeConfig={themeConfig} />
        )}

        {stats.followUps.length > 0 && filter === 'today' && (
          <div className="rounded-2xl border p-4 mt-2" style={{ borderColor: themeConfig.colors.border, backgroundColor: themeConfig.colors.surface }}>
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={14} style={{ color: themeConfig.colors.primary }} />
              <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>عملاء يستحقون متابعة</p>
            </div>
            <div className="space-y-2">
              {stats.followUps.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTemplateFor(f)}
                  className="w-full flex items-center justify-between text-right"
                >
                  <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>{displayClientName(f)}</span>
                  <span className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>مرّ أسبوعان+</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setQuickOpen(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center"
        style={{ backgroundColor: themeConfig.colors.primary }}
        aria-label="إدخال سريع"
      >
        <Plus size={26} />
      </button>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-40 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold text-white shadow-lg"
            style={{ backgroundColor: themeConfig.colors.text }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <BarberQuickEntry proId={proId} open={quickOpen} onClose={() => setQuickOpen(false)} onDone={() => void load()} />
      <BarberAssistSheet
        open={assistOpen}
        onClose={() => setAssistOpen(false)}
        defaultQuestion={assistCtx.question || ''}
        context={assistCtx}
        onUseDraft={(draft) => {
          const target = rows.find(r => displayClientName(r) === assistCtx.clientName && r.client_id);
          if (target) void openChat(target, draft);
          else setToast('افتح محادثة عميل أولاً لاستخدام المسودة');
        }}
      />

      <AnimatePresence>
        {acceptFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 p-4"
            onClick={() => setAcceptFor(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border p-4"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>قبول الطلب وتحديد الوقت</h3>
                <button type="button" onClick={() => setAcceptFor(null)} aria-label="إغلاق">
                  <X size={18} style={{ color: themeConfig.colors.textMuted }} />
                </button>
              </div>
              <p className="text-[11px] mb-3 leading-5" style={{ color: themeConfig.colors.textMuted }}>
                اتصل بالزبون أولاً، ثم اختر اليوم والساعة التي اتفقتما عليها.
              </p>
              {clientPhones[acceptFor.id] && (
                <a
                  href={`tel:${clientPhones[acceptFor.id]}`}
                  className="flex items-center justify-center gap-2 mb-3 h-11 rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: themeConfig.colors.primary }}
                >
                  <Phone size={16} />
                  اتصال · {clientPhones[acceptFor.id]}
                </a>
              )}
              <label className="block text-[11px] font-bold mb-1" style={{ color: themeConfig.colors.text }}>اليوم</label>
              <input
                type="date"
                value={acceptDate}
                onChange={(e) => setAcceptDate(e.target.value)}
                className="w-full h-11 rounded-xl border px-3 text-sm mb-3"
                style={{ backgroundColor: themeConfig.colors.background, borderColor: themeConfig.colors.border, color: themeConfig.colors.text }}
              />
              <p className="text-[11px] font-bold mb-2" style={{ color: themeConfig.colors.text }}>الوقت</p>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto mb-3">
                {ACCEPT_SLOTS.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setAcceptTime(slot)}
                    className="h-9 rounded-xl text-[11px] font-bold border"
                    style={{
                      backgroundColor: acceptTime === slot ? themeConfig.colors.primary : themeConfig.colors.background,
                      borderColor: acceptTime === slot ? themeConfig.colors.primary : themeConfig.colors.border,
                      color: acceptTime === slot ? '#fff' : themeConfig.colors.text,
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {acceptError && (
                <p className="text-[11px] mb-2" style={{ color: themeConfig.colors.error }}>{acceptError}</p>
              )}
              <button
                type="button"
                disabled={busyId === acceptFor.id}
                onClick={() => void confirmAccept()}
                className="w-full h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: themeConfig.colors.success }}
              >
                {busyId === acceptFor.id ? 'جاري التأكيد...' : 'تأكيد الموعد'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {templateFor && (
          <motion.div className="fixed inset-0 z-[80] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/45" aria-label="إغلاق" onClick={() => setTemplateFor(null)} />
            <motion.div
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="relative w-full max-w-lg rounded-t-3xl border-t p-4 pb-8"
              style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
            >
              <p className="text-sm font-bold mb-1" style={{ color: themeConfig.colors.text }}>رسالة إلى {displayClientName(templateFor)}</p>
              <p className="text-[11px] mb-3" style={{ color: themeConfig.colors.textMuted }}>اختر قالباً جاهزاً أو افتح الدردشة فارغة</p>
              <div className="grid gap-2">
                {BARBER_MESSAGE_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      const body = fillTemplate(tpl.body, displayClientName(templateFor));
                      const target = templateFor;
                      setTemplateFor(null);
                      void openChat(target, body);
                    }}
                    className="text-right rounded-xl p-3"
                    style={{ backgroundColor: themeConfig.colors.background }}
                  >
                    <span className="block text-xs font-bold" style={{ color: themeConfig.colors.text }}>{tpl.label}</span>
                    <span className="block text-[11px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>{tpl.body}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const target = templateFor;
                    setTemplateFor(null);
                    void openChat(target);
                  }}
                  className="h-11 rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: themeConfig.colors.primary }}
                >
                  فتح الدردشة بدون قالب
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
