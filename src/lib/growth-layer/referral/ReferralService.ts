import { REFERRAL_BASE_URL } from '@/lib/growth-layer/config';
import type { ReferralStats } from '@/lib/growth-layer/types';
import { AntiAbuseService } from '@/lib/growth-layer/validation/AntiAbuseService';
import {
  attributeReferral,
  ensureReferralCode,
  getReferralStats,
  recordInviteSent,
} from '@/supabase/growth';

const REF_STORAGE_KEY = 'hallaqi:pending-ref';

export const ReferralService = {
  storageKey: REF_STORAGE_KEY,

  storePendingCode(code: string) {
    const check = AntiAbuseService.validateReferralCode(code);
    if (!check.ok) return;
    sessionStorage.setItem(REF_STORAGE_KEY, code.trim().toUpperCase());
  },

  consumePendingCode(): string | null {
    const code = sessionStorage.getItem(REF_STORAGE_KEY);
    if (code) sessionStorage.removeItem(REF_STORAGE_KEY);
    return code;
  },

  buildLink(code: string) {
    return `${REFERRAL_BASE_URL}/ref/${code}`;
  },

  async ensureCode() {
    return ensureReferralCode();
  },

  async stats(): Promise<ReferralStats | null> {
    return getReferralStats();
  },

  async attribute(code: string, referredId?: string) {
    const check = AntiAbuseService.validateReferralCode(code);
    if (!check.ok) throw new Error(check.reason);
    return attributeReferral(code, referredId);
  },

  async trackInviteSent() {
    if (AntiAbuseService.shouldThrottleAction('invite_sent', 60_000, 10)) return;
    await recordInviteSent();
  },
};
