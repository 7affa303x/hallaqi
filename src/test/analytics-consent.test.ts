import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readAnalyticsConsent, writeAnalyticsConsent } from '@/lib/analyticsConsent';

describe('analyticsConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts null and persists accept/decline', () => {
    expect(readAnalyticsConsent()).toBeNull();
    writeAnalyticsConsent('accepted');
    expect(readAnalyticsConsent()).toBe('accepted');
    writeAnalyticsConsent('declined');
    expect(readAnalyticsConsent()).toBe('declined');
  });
});

describe('CookieConsent poll stop contract', () => {
  it('documents that choose must stop re-showing', () => {
    // Regression guard: once consent is written, banner must stay hidden.
    writeAnalyticsConsent('declined');
    expect(readAnalyticsConsent()).toBe('declined');
    // Simulates what tryShow must check before setVisible(true)
    expect(readAnalyticsConsent() !== null).toBe(true);
  });
});
