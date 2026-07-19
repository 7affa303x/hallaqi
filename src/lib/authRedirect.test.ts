import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthRedirectUrl, getCanonicalOrigin, consumeAuthUrlError } from '@/lib/authRedirect';

describe('authRedirect', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps localhost origin for local development', () => {
    expect(getAuthRedirectUrl('/')).toMatch(/^http:\/\/localhost(?::\d+)?\/$/);
    expect(getCanonicalOrigin()).toMatch(/^http:\/\/localhost(?::\d+)?$/);
  });

  it('uses canonical site URL on production-like hosts', () => {
    vi.stubGlobal('window', {
      ...window,
      location: {
        ...window.location,
        hostname: 'hallaqi.app',
        origin: 'https://hallaqi.app',
        href: 'https://hallaqi.app/',
        pathname: '/',
        search: '',
        hash: '',
      },
    });
    expect(getAuthRedirectUrl('/')).toBe('https://hallaqi.app/');
    expect(getAuthRedirectUrl('/reset-password')).toBe('https://hallaqi.app/reset-password');
    expect(getCanonicalOrigin()).toBe('https://hallaqi.app');
  });

  it('does not trap OAuth on vercel preview hosts', () => {
    vi.stubGlobal('window', {
      ...window,
      location: {
        ...window.location,
        hostname: 'hallaqi-ffkjwc38b-souf303x.vercel.app',
        origin: 'https://hallaqi-ffkjwc38b-souf303x.vercel.app',
        href: 'https://hallaqi-ffkjwc38b-souf303x.vercel.app/?error=server_error',
        pathname: '/',
        search: '?error=server_error',
        hash: '',
      },
      history: { ...window.history, state: null, replaceState: vi.fn() },
    });
    expect(getAuthRedirectUrl('/')).toBe('https://hallaqi.app/');
    expect(consumeAuthUrlError()).toMatch(/تسجيل الدخول/);
  });
});
