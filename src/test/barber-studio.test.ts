import { describe, expect, it } from 'vitest';
import {
  computeDayStats,
  displayClientName,
  parseGuestName,
  serviceLabel,
  type StudioBooking,
} from '@/lib/barber/studioHelpers';
import { fillTemplate } from '@/lib/barber/messageTemplates';

describe('barber studio helpers', () => {
  it('parses walk-in guest names from notes', () => {
    expect(parseGuestName('[عميل مباشر: كريم]\nfade منخفض')).toBe('كريم');
    expect(parseGuestName('[عميل مباشر]')).toBeNull();
    expect(displayClientName({
      id: '1',
      client_id: null,
      booking_start_time: null,
      total_price: 0,
      notes: '[عميل مباشر: سامر]',
      status: 'completed',
    })).toBe('سامر');
  });

  it('builds service labels from joined booking services', () => {
    const booking: StudioBooking = {
      id: '1',
      client_id: 'c1',
      booking_start_time: null,
      total_price: 500,
      notes: null,
      status: 'confirmed',
      booking_services: [
        { services: { name: 'قص' } },
        { services: { name: 'لحية' } },
      ],
    };
    expect(serviceLabel(booking)).toBe('قص + لحية');
  });

  it('computes today stats and gaps', () => {
    const now = new Date('2026-07-17T12:00:00');
    const rows: StudioBooking[] = [
      {
        id: 'a',
        client_id: '1',
        booking_start_time: '2026-07-17T10:00:00',
        booking_end_time: '2026-07-17T10:30:00',
        total_price: 400,
        notes: null,
        status: 'completed',
        profiles: { full_name: 'أ', avatar_url: null },
      },
      {
        id: 'b',
        client_id: '2',
        booking_start_time: '2026-07-17T12:30:00',
        booking_end_time: '2026-07-17T13:00:00',
        total_price: 500,
        notes: null,
        status: 'confirmed',
        profiles: { full_name: 'ب', avatar_url: null },
      },
    ];
    const stats = computeDayStats(rows, now);
    expect(stats.todayCount).toBe(2);
    expect(stats.completedCount).toBe(1);
    expect(stats.revenueToday).toBe(400);
    expect(stats.nextBooking?.id).toBe('b');
    expect(stats.gaps[0]?.minutes).toBeGreaterThanOrEqual(25);
  });

  it('fills message templates with client names', () => {
    expect(fillTemplate('تم التأكيد', 'علي')).toContain('علي');
  });
});
