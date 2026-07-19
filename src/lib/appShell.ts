/** Keep the installed PWA on the latest shell — bust stale Workbox caches. */

const BUILD_KEY = 'hallaqi-app-build-v1';

/** Bump when shipping shell/layout fixes so phones drop old SW caches. */
export const APP_SHELL_BUILD = '2026-07-19-launch-hotfix-2';

/** @returns true if a reload was triggered (caller must not mount React). */
export async function ensureFreshAppShell(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  let previous: string | null = null;
  try {
    previous = localStorage.getItem(BUILD_KEY);
  } catch {
    /* ignore */
  }

  if (previous === APP_SHELL_BUILD) return false;

  let clearedSomething = false;
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      if (keys.length > 0) {
        await Promise.all(keys.map(key => caches.delete(key)));
        clearedSomething = true;
      }
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) {
        await Promise.all(regs.map(reg => reg.unregister()));
        clearedSomething = true;
      }
    }
  } catch {
    /* best-effort */
  }

  try {
    localStorage.setItem(BUILD_KEY, APP_SHELL_BUILD);
  } catch {
    /* ignore */
  }

  // Reload when upgrading from a known older build, or when we had to drop a stale SW.
  if (previous || clearedSomething) {
    const url = new URL(window.location.href);
    url.searchParams.set('hallaqi_refresh', APP_SHELL_BUILD);
    window.location.replace(`${url.pathname}${url.search}${url.hash}`);
    return true;
  }

  return false;
}
