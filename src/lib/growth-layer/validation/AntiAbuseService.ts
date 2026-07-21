/**
 * Reusable client-side validation before growth actions.
 * Server-side checks remain authoritative (RPCs + abuse_flags).
 */

export type AbuseCheckResult = { ok: true } | { ok: false; reason: string };

export const AntiAbuseService = {
  validateReferralAttribution(referrerId: string, referredId: string): AbuseCheckResult {
    if (!referrerId || !referredId) return { ok: false, reason: 'missing_ids' };
    if (referrerId === referredId) return { ok: false, reason: 'self_referral' };
    return { ok: true };
  },

  validateReferralCode(code: string): AbuseCheckResult {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { ok: false, reason: 'empty_code' };
    if (!/^HALLAQI-[A-Z0-9]{4,12}$/.test(normalized)) return { ok: false, reason: 'invalid_format' };
    return { ok: true };
  },

  validateMiniSiteSlug(slug: string): AbuseCheckResult {
    const s = slug.trim().toLowerCase();
    if (s.length < 3 || s.length > 32) return { ok: false, reason: 'invalid_length' };
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s)) return { ok: false, reason: 'invalid_chars' };
    const reserved = new Set(['admin', 'api', 'ref', 'login', 'register', 'barber', 'post', 'store']);
    if (reserved.has(s)) return { ok: false, reason: 'reserved' };
    return { ok: true };
  },

  shouldThrottleAction(key: string, windowMs: number, max: number): boolean {
    try {
      const raw = localStorage.getItem(`hallaqi-abuse:${key}`);
      const now = Date.now();
      const hits: number[] = raw ? JSON.parse(raw) as number[] : [];
      const recent = hits.filter(t => now - t < windowMs);
      if (recent.length >= max) return true;
      recent.push(now);
      localStorage.setItem(`hallaqi-abuse:${key}`, JSON.stringify(recent));
      return false;
    } catch {
      return false;
    }
  },
};
