import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FEATURE_FLAGS,
  isCashOnlyPayments,
  isWebPushConfigured,
  isWhatsAppSupportConfigured,
  isSettingsItemVisible,
  canAccessMfaSettings,
} from '@/lib/featureFlags';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('featureFlags', () => {
  it('keeps soft-launch monetization paused', () => {
    expect(FEATURE_FLAGS.cardPaymentsEnabled).toBe(false);
    expect(FEATURE_FLAGS.ccpPaymentsEnabled).toBe(false);
    expect(FEATURE_FLAGS.paidSubscriptionsEnabled).toBe(false);
    expect(FEATURE_FLAGS.aiImageGenerationEnabled).toBe(false);
    expect(FEATURE_FLAGS.competitionsEnabled).toBe(false);
    expect(FEATURE_FLAGS.accountTypeSwitchEnabled).toBe(false);
    expect(isCashOnlyPayments()).toBe(true);
  });

  it('detects VAPID only when configured', () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    expect(isWebPushConfigured()).toBe(false);
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BK-test');
    expect(isWebPushConfigured()).toBe(true);
  });

  it('requires WhatsApp number when support flag is on', () => {
    vi.stubEnv('VITE_SUPPORT_WHATSAPP', '');
    expect(isWhatsAppSupportConfigured()).toBe(false);
    vi.stubEnv('VITE_SUPPORT_WHATSAPP', '213555000000');
    expect(isWhatsAppSupportConfigured()).toBe(FEATURE_FLAGS.whatsappSupportEnabled);
  });

  it('hides most settings at soft launch but keeps core items', () => {
    expect(isSettingsItemVisible('theme', 'client')).toBe(true);
    expect(isSettingsItemVisible('editProfile', 'client')).toBe(true);
    expect(isSettingsItemVisible('logout', 'client')).toBe(true);
    expect(isSettingsItemVisible('animation', 'client')).toBe(false);
    expect(isSettingsItemVisible('paymentMethods', 'client')).toBe(false);
    expect(isSettingsItemVisible('idVerification', 'client')).toBe(false);
    expect(isSettingsItemVisible('services', 'client')).toBe(false);
    expect(isSettingsItemVisible('services', 'barber')).toBe(true);
  });

  it('limits MFA settings to privileged roles', () => {
    expect(canAccessMfaSettings('admin')).toBe(true);
    expect(canAccessMfaSettings('client')).toBe(false);
    expect(canAccessMfaSettings('barber')).toBe(false);
  });
});
