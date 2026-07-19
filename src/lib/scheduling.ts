export interface ExistingSlot {
  booking_start_time: string | null;
  booking_end_time: string | null;
}

export interface RankedSlot {
  time: string;
  score: number;
  reasons: string[];
}

function minutes(time: string): number {
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  return hours * 60 + mins;
}

export function rankAvailableSlots(
  slots: string[],
  date: string,
  existingBookings: ExistingSlot[],
  preferredHour?: number
): RankedSlot[] {
  if (slots.length === 0) return [];
  const today = new Date();
  const isToday = date === today.toISOString().slice(0, 10);

  return slots.map((time, index) => {
    const slotMinutes = minutes(time);
    let score = 100 - index * 2;
    const reasons: string[] = [];

    if (isToday) {
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      const leadMinutes = slotMinutes - nowMinutes;
      if (leadMinutes >= 60 && leadMinutes <= 180) {
        score += 18;
        reasons.push('متاح قريباً');
      }
    }

    if (typeof preferredHour === 'number') {
      const distance = Math.abs(slotMinutes - preferredHour * 60);
      score += Math.max(0, 20 - Math.round(distance / 30) * 2);
      if (distance <= 60) reasons.push('يشبه مواعيدك السابقة');
    } else if (slotMinutes >= 9 * 60 && slotMinutes <= 12 * 60) {
      score += 8;
      reasons.push('وقت صباحي مناسب');
    }

    const adjacent = existingBookings.some(booking => {
      if (!booking.booking_start_time || !booking.booking_end_time) return false;
      if (!booking.booking_start_time.startsWith(date)) return false;
      const start = new Date(booking.booking_start_time);
      const end = new Date(booking.booking_end_time);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      return Math.min(
        Math.abs(slotMinutes - startMinutes),
        Math.abs(slotMinutes - endMinutes)
      ) <= 30;
    });
    if (adjacent) {
      score += 5;
      reasons.push('يقلل انتظار الحلاق');
    }

    return { time, score, reasons: reasons.slice(0, 2) };
  }).sort((a, b) => b.score - a.score || a.time.localeCompare(b.time));
}

export function preferredBookingHour(times: string[]): number | undefined {
  const values = times
    .map(time => Number(time.split(':')[0]))
    .filter(value => Number.isInteger(value) && value >= 0 && value <= 23);
  if (!values.length) return undefined;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export interface NextSlotHint {
  date: string;
  time: string;
  labelAr: string;
  labelFr: string;
  labelEn: string;
}

function generateSlots(open: string, close: string, stepMinutes = 30): string[] {
  const start = minutes(open);
  const end = minutes(close);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const slots: string[] = [];
  for (let m = start; m + stepMinutes <= end; m += stepMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

/** Approximate next open slot from working hours only (no booking occupancy). */
export function getNextAvailableSlotHint(
  workingHours: Record<string, { open: string; close: string; isOpen: boolean }>,
  now = new Date()
): NextSlotHint | null {
  const algiersNow = new Date(
    now.toLocaleString('en-US', { timeZone: 'Africa/Algiers' })
  );

  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(algiersNow);
    day.setDate(algiersNow.getDate() + offset);
    const key = DAY_KEYS[day.getDay()];
    const hours = workingHours[key];
    if (!hours?.isOpen || hours.open === 'closed' || hours.close === 'closed') continue;

    const slots = generateSlots(hours.open, hours.close);
    if (!slots.length) continue;

    let candidates = slots;
    if (offset === 0) {
      const nowMinutes = algiersNow.getHours() * 60 + algiersNow.getMinutes() + 30;
      candidates = slots.filter(slot => minutes(slot) >= nowMinutes);
    }
    if (!candidates.length) continue;

    const time = candidates[0];
    const date = day.toISOString().slice(0, 10);
    const dayLabelAr = offset === 0 ? 'اليوم' : offset === 1 ? 'غداً' : day.toLocaleDateString('ar-DZ', { weekday: 'short' });
    const dayLabelFr = offset === 0 ? 'Aujourd’hui' : offset === 1 ? 'Demain' : day.toLocaleDateString('fr-DZ', { weekday: 'short' });
    const dayLabelEn = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : day.toLocaleDateString('en-GB', { weekday: 'short' });

    return {
      date,
      time,
      labelAr: `${dayLabelAr} ${time}`,
      labelFr: `${dayLabelFr} ${time}`,
      labelEn: `${dayLabelEn} ${time}`,
    };
  }
  return null;
}

export function nextSlotLabel(
  hint: NextSlotHint | null,
  language: 'ar' | 'fr' | 'en'
): string | null {
  if (!hint) return null;
  return language === 'fr' ? hint.labelFr : language === 'en' ? hint.labelEn : hint.labelAr;
}
