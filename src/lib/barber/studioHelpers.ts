import type { BookingStatus } from '@/types';

export interface StudioBooking {
  id: string;
  client_id: string | null;
  booking_start_time: string | null;
  booking_end_time?: string | null;
  total_price: number | null;
  notes: string | null;
  status: BookingStatus;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  services?: { name: string | null } | null;
  booking_services?: Array<{ services?: { name: string | null } | null }>;
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
    .filter(r => isSameDay(r.booking_start_time, now) && r.status !== 'cancelled')
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
    || today.find(r => r.status === 'pending' && new Date(r.booking_start_time || 0) > now)
    || null;

  const followUps = rows
    .filter(r => r.status === 'completed' && r.client_id && r.booking_start_time)
    .filter(r => {
      const days = (now.getTime() - new Date(r.booking_start_time!).getTime()) / 86400000;
      return days >= 14 && days <= 45;
    })
    .slice(0, 5);

  const gaps: DayStats['gaps'] = [];
  for (let i = 0; i < today.length; i += 1) {
    const current = today[i];
    const next = today[i + 1] || null;
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
