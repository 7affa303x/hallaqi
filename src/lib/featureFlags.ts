/** Feature flags for launch-scope exclusions from the monetization brief. */
export const FEATURE_FLAGS = {
  loyaltyEnabled: false,
  marketplaceInAppCheckout: false,
  marketplaceCommissions: false,
  shippingLogistics: false,
  affiliates: false,
  marketplaceSeedFallback: false,
  cardPaymentsEnabled: false,
  ccpPaymentsEnabled: false,
  paidSubscriptionsEnabled: false,
  paidPlacementsEnabled: false,
  /**
   * Fill analytics UI with mock numbers when local events are sparse.
   * Off at launch so sellers see real (possibly zero) device data.
   */
  marketplaceMockAnalytics: false,
  /**
   * Server-synced bookmarks/saves — paused; device storage only.
   */
  serverBookmarksEnabled: false,
  /**
   * Admin audit log UI — paused until table + RLS ship.
   */
  adminAuditLogEnabled: false,
  /**
   * Dedicated moderator role console — paused.
   */
  moderatorConsoleEnabled: false,
  /**
   * E2E suite in CI — paused (unit/typecheck/build remain).
   */
  e2eCiEnabled: false,
  /**
   * Dynamic per-page Open Graph for SPA routes — paused (static index OG only).
   */
  dynamicOgEnabled: false,
} as const;

/** User-facing label for deferred launch features. */
export const COMING_SOON_LABEL = 'قريباً';

/** User-facing label for intentionally paused launch features. */
export const PAUSED_LABEL = 'متوقف';

export function isCashOnlyPayments(): boolean {
  return !FEATURE_FLAGS.cardPaymentsEnabled && !FEATURE_FLAGS.ccpPaymentsEnabled;
}

export function isWebPushConfigured(): boolean {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  return Boolean(key?.trim());
}
