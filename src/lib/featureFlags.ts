/** Feature flags for soft-launch scope (Algeria cash booking MVP). */
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
  /**
   * Soft launch: keep Arabic primary. fr/en exist but are not marketed as complete.
   */
  fullI18nEnabled: false,
  /**
   * React Query data layer — paused; Zustand + Context remain.
   */
  reactQueryEnabled: false,
  /**
   * WhatsApp support — on when VITE_SUPPORT_WHATSAPP is set.
   */
  whatsappSupportEnabled: true,
  /**
   * Gemini hairstyle image generation — paused (quota / cost).
   */
  aiImageGenerationEnabled: false,
  /**
   * Soft launch: Algeria only in discovery (hide TN/MA/LY chips).
   */
  algeriaOnlyDiscovery: true,
  /**
   * Soft launch: register as client / barber / store (doctor hidden until verification).
   * When true, only client+barber; when false, use softLaunchRegistrationRoles.
   */
  clientBarberRegistrationOnly: false,
  /**
   * Soft launch: hide subscription / paid placement / Baridi entry points.
   */
  hideMonetizationSurfaces: true,
  /**
   * Live queue for clients — not shipping in v1 (barber studio day board stays).
   */
  liveQueueEnabled: false,
  /**
   * Phone OTP auth — not shipping in v1 (collect phone number only).
   */
  phoneOtpAuthEnabled: false,
  /**
   * MFA (TOTP) — soft launch: admin/moderator only in UI.
   */
  mfaForPrivilegedOnly: true,
  /**
   * Forum competitions banner + join flow — off until entry→post linking is complete.
   * Code path is ready; flip to true when seeding active competitions.
   */
  competitionsEnabled: false,
  /**
   * Account type switcher on profile — client / barber / store without conditions.
   */
  accountTypeSwitchEnabled: true,
  /**
   * Advanced appearance (animation style, country, currency) — soft-hide at launch.
   */
  advancedAppearanceEnabled: false,
  /**
   * Advanced privacy toggles (profile visible, location, bookings, block list).
   */
  advancedPrivacyEnabled: false,
  /**
   * Email notification preferences — soft-hide (push + booking reminders remain).
   */
  emailNotificationsEnabled: false,
  /**
   * ID card verification UI — paused.
   */
  idVerificationEnabled: false,
  /**
   * Linked social accounts — paused.
   */
  linkedAccountsEnabled: false,
  /**
   * Export personal data action — paused.
   */
  dataExportEnabled: false,
  /**
   * Gamification cards (badges / streak / points strip) — soft-hide clutter.
   */
  gamificationSurfacesEnabled: false,
  /**
   * Licenses / open-source credits page — soft-hide.
   */
  licensesPageEnabled: false,
  /**
   * Barber "extra services" section in marketplace — paused.
   * Booking services remain in the barber profile; marketplace stays product-focused.
   */
  barberExtrasInMarketplace: false,
} as const;

/** User-facing label for deferred launch features. */
export const COMING_SOON_LABEL = 'قريباً';

/** User-facing label for intentionally paused launch features. */
export const PAUSED_LABEL = 'متوقف';

export function isCashOnlyPayments(): boolean {
  return !FEATURE_FLAGS.cardPaymentsEnabled && !FEATURE_FLAGS.ccpPaymentsEnabled;
}

/** Soft-launch registration / switch roles — doctor excluded until verification. */
export const SOFT_LAUNCH_ACCOUNT_ROLES = ['client', 'barber', 'store'] as const;
export type SoftLaunchAccountRole = (typeof SOFT_LAUNCH_ACCOUNT_ROLES)[number];

export function isWebPushConfigured(): boolean {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  return Boolean(key?.trim());
}

export function isWhatsAppSupportConfigured(): boolean {
  if (!FEATURE_FLAGS.whatsappSupportEnabled) return false;
  const n = import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined;
  return Boolean(n?.trim());
}

export function getSupportWhatsAppUrl(): string | null {
  if (!isWhatsAppSupportConfigured()) return null;
  const raw = String(import.meta.env.VITE_SUPPORT_WHATSAPP || '').replace(/\D/g, '');
  if (!raw) return null;
  return `https://wa.me/${raw}`;
}

/** Settings item ids visible at soft launch (others stay in code, hidden in UI). */
const LAUNCH_VISIBLE_SETTING_IDS = new Set([
  'theme',
  'fontSize',
  'language',
  'pushNotifications',
  'bookingReminders',
  'changePassword',
  'helpCenter',
  'contactUs',
  'aboutApp',
  'privacyPolicy',
  'termsOfService',
  'clearCache',
  'deleteAccount',
  'logout',
]);

/**
 * Whether a settings list item should render for the current soft-launch + role.
 * Hide-not-delete: items remain in mockData; this filters at render time.
 */
export function isSettingsItemVisible(
  itemId: string,
  _role: string | undefined,
): boolean {
  if (FEATURE_FLAGS.advancedAppearanceEnabled) {
    // when advanced appearance is on, still use base set + extras below
  } else if (itemId === 'animation' || itemId === 'country' || itemId === 'currency') {
    return false;
  }

  if (!FEATURE_FLAGS.emailNotificationsEnabled && itemId === 'emailNotifications') return false;
  if (!FEATURE_FLAGS.emailNotificationsEnabled && itemId === 'forumReplies') return false;
  if (!FEATURE_FLAGS.advancedPrivacyEnabled && [
    'profileVisible', 'showLocation', 'showBookings', 'allowMessages', 'blockList',
  ].includes(itemId)) return false;
  if (!FEATURE_FLAGS.idVerificationEnabled && itemId === 'idVerification') return false;
  if (!FEATURE_FLAGS.linkedAccountsEnabled && itemId === 'linkedAccounts') return false;
  if (!FEATURE_FLAGS.dataExportEnabled && itemId === 'exportData') return false;
  if (!FEATURE_FLAGS.licensesPageEnabled && itemId === 'licenses') return false;
  if (FEATURE_FLAGS.hideMonetizationSurfaces && itemId === 'paymentMethods') return false;
  if (!FEATURE_FLAGS.paidSubscriptionsEnabled && itemId === 'subscription') return false;

  // Profile edit: avatar/name tap only — hide duplicate settings row + old gear entry.
  if (itemId === 'editProfile') return false;

  // Services management moved to barber profile header shortcuts
  if (itemId === 'services') return false;

  // Soft launch: only show the curated set (plus role-gated services above)
  if (!LAUNCH_VISIBLE_SETTING_IDS.has(itemId) && itemId !== 'services') {
    // Allow advanced appearance extras when flag flips
    if (FEATURE_FLAGS.advancedAppearanceEnabled
      && (itemId === 'animation' || itemId === 'country' || itemId === 'currency')) {
      return true;
    }
    if (FEATURE_FLAGS.emailNotificationsEnabled
      && (itemId === 'emailNotifications' || itemId === 'forumReplies')) {
      return true;
    }
    if (FEATURE_FLAGS.advancedPrivacyEnabled
      && ['profileVisible', 'showLocation', 'showBookings', 'allowMessages', 'blockList'].includes(itemId)) {
      return true;
    }
    if (FEATURE_FLAGS.idVerificationEnabled && itemId === 'idVerification') return true;
    if (FEATURE_FLAGS.linkedAccountsEnabled && itemId === 'linkedAccounts') return true;
    if (FEATURE_FLAGS.dataExportEnabled && itemId === 'exportData') return true;
    if (FEATURE_FLAGS.licensesPageEnabled && itemId === 'licenses') return true;
    if (!FEATURE_FLAGS.hideMonetizationSurfaces && itemId === 'paymentMethods') return true;
    return false;
  }

  return true;
}

export function canAccessMfaSettings(role: string | undefined): boolean {
  if (!FEATURE_FLAGS.mfaForPrivilegedOnly) return true;
  return role === 'admin' || role === 'moderator';
}
