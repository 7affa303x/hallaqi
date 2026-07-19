import { describe, expect, it } from 'vitest';
import { normalizeAlgerianPhone, algerianPhoneSchema, registerSchema } from '@/lib/validation';

describe('normalizeAlgerianPhone', () => {
  it('accepts local and international forms', () => {
    expect(normalizeAlgerianPhone('0555123456')).toBe('+213555123456');
    expect(normalizeAlgerianPhone('213555123456')).toBe('+213555123456');
    expect(normalizeAlgerianPhone('+213 555 12 34 56')).toBe('+213555123456');
    expect(normalizeAlgerianPhone('0666123456')).toBe('+213666123456');
    expect(normalizeAlgerianPhone('0777123456')).toBe('+213777123456');
  });

  it('rejects invalid numbers', () => {
    expect(normalizeAlgerianPhone('0123456789')).toBeNull();
    expect(normalizeAlgerianPhone('555')).toBeNull();
    expect(normalizeAlgerianPhone('')).toBeNull();
  });
});

describe('registerSchema soft-launch', () => {
  it('requires a valid Algerian phone', () => {
    const bad = registerSchema.safeParse({
      name: 'أحمد',
      email: 'a@b.com',
      phone: '123',
      password: 'secret1',
      confirm: 'secret1',
      accountType: 'client',
      acceptedTerms: true,
    });
    expect(bad.success).toBe(false);

    const good = registerSchema.safeParse({
      name: 'أحمد',
      email: 'a@b.com',
      phone: '0555123456',
      password: 'secret1',
      confirm: 'secret1',
      accountType: 'barber',
      acceptedTerms: true,
    });
    expect(good.success).toBe(true);
    expect(algerianPhoneSchema.safeParse('0555123456').success).toBe(true);
  });
});
