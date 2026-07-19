import { describe, expect, it } from 'vitest';
import { getNextAvailableSlotHint } from '@/lib/scheduling';
import type { WorkingHours } from '@/types';

describe('getNextAvailableSlotHint', () => {
  const hours: WorkingHours = {
    sunday: { open: '09:00', close: '17:00', isOpen: true },
    monday: { open: '09:00', close: '17:00', isOpen: true },
    tuesday: { open: '09:00', close: '17:00', isOpen: true },
    wednesday: { open: '09:00', close: '17:00', isOpen: true },
    thursday: { open: '09:00', close: '17:00', isOpen: true },
    friday: { open: 'closed', close: 'closed', isOpen: false },
    saturday: { open: '09:00', close: '17:00', isOpen: true },
  };

  it('returns a slot within open hours', () => {
    const hint = getNextAvailableSlotHint(hours, new Date('2026-07-20T08:00:00+01:00')); // Monday morning before open
    expect(hint).not.toBeNull();
    expect(hint!.time).toBe('09:00');
  });

  it('skips closed Friday', () => {
    const hint = getNextAvailableSlotHint(hours, new Date('2026-07-24T10:00:00+01:00')); // Friday
    expect(hint).not.toBeNull();
    // Next open day after Friday is Saturday
    expect(hint!.date).toBe('2026-07-25');
  });
});
