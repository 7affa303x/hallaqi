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

  it('uses canonical site URL on production host', () => {
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

  it('keeps the current vercel preview origin for end-to-end login tests', () => {
    vi.stubGlobal('window', {
      ...window,
      location: {
        ...window.location,
        hostname: 'hallaqi-8yj9ildjr-souf303x.vercel.app',
        origin: 'https://hallaqi-8yj9ildjr-souf303x.vercel.app',
        href: 'https://hallaqi-8yj9ildjr-souf303x.vercel.app/',
        pathname: '/',
        search: '',
        hash: '',
      },
      history: { ...window.history, state: null, replaceState: vi.fn() },
    });
    expect(getAuthRedirectUrl('/')).toBe('https://hallaqi-8yj9ildjr-souf303x.vercel.app/');
    expect(getCanonicalOrigin()).toBe('https://hallaqi-8yj9ildjr-souf303x.vercel.app');
  });

  it('clears oauth error query params', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      ...window,
      location: {
        ...window.location,
        hostname: 'hallaqi.app',
        origin: 'https://hallaqi.app',
        href: 'https://hallaqi.app/?error=server_error&error_description=Server%20error',
        pathname: '/',
        search: '?error=server_error&error_description=Server%20error',
        hash: '',
      },
      history: { ...window.history, state: null, replaceState },
    });
    expect(consumeAuthUrlError()).toMatch(/تسجيل الدخول/);
    expect(replaceState).toHaveBeenCalled();
  });
});
