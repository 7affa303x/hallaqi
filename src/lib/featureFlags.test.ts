import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FEATURE_FLAGS,
  isCashOnlyPayments,
  isWebPushConfigured,
  isWhatsAppSupportConfigured,
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
});
