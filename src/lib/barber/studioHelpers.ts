import type { BookingStatus } from '@/types';

export interface StudioBooking {
  id: string;
  client_id: string | null;
  booking_start_time: string | null;
  booking_end_time?: string | null;
  preferred_date?: string | null;
  preferred_time_of_day?: string | null;
  time_set_by_barber?: boolean | null;
  total_price: number | null;
  notes: string | null;
  status: BookingStatus;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  services?: { name: string | null } | null;
  booking_services?: Array<{ services?: { name: string | null } | null; duration_snapshot?: number | null }>;
  /** Loaded via get_booking_client_phone for pending accept flow */
  clientPhone?: string | null;
}

export function preferredPeriodLabel(value: string | null | undefined): string {
  switch (value) {
    case 'morning': return 'صباحاً';
    case 'afternoon': return 'بعد الظهر';
    case 'evening': return 'مساءً';
    default: return 'أي وقت';
  }
}

export function requestDayLabel(booking: StudioBooking): string {
  const raw = booking.preferred_date || booking.booking_start_time;
  if (!raw) return 'يوم غير محدد';
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  return d.toLocaleDateString('ar-DZ', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function bookingDurationMinutes(booking: StudioBooking): number {
  const fromServices = booking.booking_services
    ?.reduce((sum, item) => sum + (item.duration_snapshot || 0), 0) || 0;
  if (fromServices > 0) return fromServices;
  if (booking.booking_start_time && booking.booking_end_time) {
    return Math.max(15, Math.round(
      (new Date(booking.booking_end_time).getTime() - new Date(booking.booking_start_time).getTime()) / 60000,
    ));
  }
  return 30;
}

export function parseGuestName(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/\[عميل مباشر(?::\s*([^\]]+))?\]/);
  return match?.[1]?.trim() || null;
}

export function displayClientName(booking: StudioBooking): string {
  return booking.profiles?.full_name
    || parseGuestName(booking.notes)
    || 'عميل';
}

export function serviceLabel(booking: StudioBooking): string {
  const fromJoin = booking.booking_services
    ?.map(item => item.services?.name)
    .filter(Boolean)
    .join(' + ');
  return fromJoin || booking.services?.name || 'خدمة';
}

export function isSameDay(iso: string | null | undefined, day = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear()
    && d.getMonth() === day.getMonth()
    && d.getDate() === day.getDate();
}

export function startOfDay(day = new Date()): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(day = new Date()): Date {
  const d = new Date(day);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function formatClock(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
}

export function formatDayLabel(day = new Date()): string {
  return day.toLocaleDateString('ar-DZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export interface DayStats {
  todayCount: number;
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
  revenueToday: number;
  nextBooking: StudioBooking | null;
  nowBooking: StudioBooking | null;
  followUps: StudioBooking[];
  gaps: Array<{ after: StudioBooking; minutes: number; before: StudioBooking | null }>;
}

export function computeDayStats(rows: StudioBooking[], now = new Date()): DayStats {
  const today = rows
    .filter(r => {
      if (r.status === 'cancelled') return false;
      if (r.status === 'pending') {
        const pref = r.preferred_date || r.booking_start_time;
        return pref ? isSameDay(pref.includes('T') ? pref : `${pref}T12:00:00`, now) : false;
      }
      return isSameDay(r.booking_start_time, now);
    })
    .sort((a, b) => new Date(a.booking_start_time || 0).getTime() - new Date(b.booking_start_time || 0).getTime());

  const pendingCount = rows.filter(r => r.status === 'pending').length;
  const confirmedToday = today.filter(r => r.status === 'confirmed' || r.status === 'in_progress');
  const completedToday = today.filter(r => r.status === 'completed');
  const revenueToday = completedToday.reduce((sum, r) => sum + (r.total_price || 0), 0);

  const nowBooking = confirmedToday.find(r => {
    const start = new Date(r.booking_start_time || 0);
    const end = r.booking_end_time
      ? new Date(r.booking_end_time)
      : new Date(start.getTime() + 45 * 60000);
    return start <= now && now <= end;
  }) || null;

  const nextBooking = confirmedToday.find(r => new Date(r.booking_start_time || 0) > now)
    || null;

  const followUps = rows
    .filter(r => r.status === 'completed' && r.client_id && r.booking_start_time)
    .filter(r => {
      const days = (now.getTime() - new Date(r.booking_start_time!).getTime()) / 86400000;
      return days >= 14 && days <= 45;
    })
    .slice(0, 5);

  const gaps: DayStats['gaps'] = [];
  const scheduled = today.filter(r => r.status !== 'pending' && r.booking_start_time);
  for (let i = 0; i < scheduled.length; i += 1) {
    const current = scheduled[i];
    const next = scheduled[i + 1] || null;
    const end = current.booking_end_time
      ? new Date(current.booking_end_time)
      : new Date(new Date(current.booking_start_time || 0).getTime() + 40 * 60000);
    const nextStart = next
      ? new Date(next.booking_start_time || 0)
      : null;
    if (nextStart) {
      const minutes = minutesBetween(end, nextStart);
      if (minutes >= 25) gaps.push({ after: current, minutes, before: next });
    }
  }

  return {
    todayCount: today.length,
    pendingCount,
    confirmedCount: confirmedToday.length,
    completedCount: completedToday.length,
    revenueToday,
    nextBooking,
    nowBooking,
    followUps,
    gaps: gaps.slice(0, 3),
  };
}
