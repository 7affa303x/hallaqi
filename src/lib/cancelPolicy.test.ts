import { describe, expect, it } from 'vitest';
import { CANCEL_POLICY } from '@/lib/cancelPolicy';

describe('cancelPolicy', () => {
  it('documents a 2-hour free cancel window', () => {
    expect(CANCEL_POLICY.freeCancelHoursBefore).toBe(2);
    expect(CANCEL_POLICY.summaryAr).toMatch(/ساعتين/);
    expect(CANCEL_POLICY.confirmAr('أحمد')).toContain('أحمد');
  });
});
