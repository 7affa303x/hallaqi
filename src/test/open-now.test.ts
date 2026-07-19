import { describe, expect, it } from 'vitest';
import { isBarberOpenNow } from '@/lib/utils';
import type { WorkingHours } from '@/types';

const weekdayHours: WorkingHours = {
  sunday: { open: '09:00', close: '17:00', isOpen: true },
  monday: { open: '09:00', close: '17:00', isOpen: true },
  tuesday: { open: '09:00', close: '17:00', isOpen: true },
  wednesday: { open: '09:00', close: '17:00', isOpen: true },
  thursday: { open: '09:00', close: '17:00', isOpen: true },
  friday: { open: 'closed', close: 'closed', isOpen: false },
  saturday: { open: '10:00', close: '14:00', isOpen: true },
};

/** Build a Date whose Africa/Algiers wall-clock matches the given parts. */
function algiersDate(isoLocal: string): Date {
  // isoLocal like '2026-07-20T12:00:00' interpreted as Algiers (UTC+1, no DST)
  return new Date(`${isoLocal}+01:00`);
}

describe('isBarberOpenNow', () => {
  it('returns true during weekday open hours in Africa/Algiers', () => {
    // Monday 12:00 Algiers
    expect(isBarberOpenNow(weekdayHours, algiersDate('2026-07-20T12:00:00'))).toBe(true);
  });

  it('returns false before open and after close', () => {
    expect(isBarberOpenNow(weekdayHours, algiersDate('2026-07-20T08:59:00'))).toBe(false);
    expect(isBarberOpenNow(weekdayHours, algiersDate('2026-07-20T17:00:00'))).toBe(false);
  });

  it('returns false on closed days', () => {
    // Friday
    expect(isBarberOpenNow(weekdayHours, algiersDate('2026-07-24T12:00:00'))).toBe(false);
  });

  it('respects Saturday shorter hours', () => {
    expect(isBarberOpenNow(weekdayHours, algiersDate('2026-07-25T11:00:00'))).toBe(true);
    expect(isBarberOpenNow(weekdayHours, algiersDate('2026-07-25T15:00:00'))).toBe(false);
  });
});
