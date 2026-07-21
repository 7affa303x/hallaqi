import { describe, expect, it } from 'vitest';
import { REFERRAL_XP, AMBASSADOR_REQUIREMENTS } from '@/lib/growth-layer/config';
import { AntiAbuseService } from '@/lib/growth-layer/validation/AntiAbuseService';
import { ReferralService } from '@/lib/growth-layer/referral/ReferralService';
import { CoinsService } from '@/lib/growth-layer/economy/CoinsService';

describe('growth layer config', () => {
  it('defines referral XP rewards', () => {
    expect(REFERRAL_XP.barber).toBe(50);
    expect(REFERRAL_XP.customer).toBe(10);
  });

  it('defines ambassador requirements', () => {
    expect(AMBASSADOR_REQUIREMENTS.minLevel).toBeGreaterThanOrEqual(5);
  });
});

describe('AntiAbuseService', () => {
  it('blocks self referral', () => {
    const r = AntiAbuseService.validateReferralAttribution('a', 'a');
    expect(r.ok).toBe(false);
  });

  it('validates referral code format', () => {
    expect(AntiAbuseService.validateReferralCode('HALLAQI-A82D').ok).toBe(true);
    expect(AntiAbuseService.validateReferralCode('bad').ok).toBe(false);
  });
});

describe('ReferralService', () => {
  it('builds referral link', () => {
    expect(ReferralService.buildLink('HALLAQI-TEST')).toContain('/ref/HALLAQI-TEST');
  });
});

describe('CoinsService', () => {
  it('computes placeholder cashback', () => {
    expect(CoinsService.placeholderCashbackFromPurchase(1000)).toBe(10);
  });
});
