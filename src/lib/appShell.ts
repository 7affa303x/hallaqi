/** Keep installed clients on the latest deploy — pairs with auth-shell.js + build meta tag. */

declare const __HALLAQI_BUILD_ID__: string;

const BUILD_KEY = 'hallaqi-app-build-v1';

function currentBuildId(): string {
  if (typeof __HALLAQI_BUILD_ID__ === 'string' && __HALLAQI_BUILD_ID__) {
    return __HALLAQI_BUILD_ID__;
  }
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="hallaqi-build"]');
    const fromMeta = meta?.getAttribute('content')?.trim();
    if (fromMeta) return fromMeta;
  }
  return 'unknown';
}

export const APP_SHELL_BUILD = currentBuildId();

async function clearServiceWorkerAndCaches(): Promise<boolean> {
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
  return clearedSomething;
}

/**
 * @returns true if a reload was triggered (caller must not mount React).
 * auth-shell.js handles the first pass; this is a secondary safety net in the bundle.
 */
export async function ensureFreshAppShell(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const buildId = currentBuildId();
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(BUILD_KEY);
  } catch {
    /* ignore */
  }

  if (previous === buildId) return false;

  const clearedSomething = await clearServiceWorkerAndCaches();

  try {
    localStorage.setItem(BUILD_KEY, buildId);
  } catch {
    /* ignore */
  }

  if (previous || clearedSomething) {
    const url = new URL(window.location.href);
    url.searchParams.set('hallaqi_refresh', buildId.slice(0, 24));
    window.location.replace(`${url.pathname}${url.search}${url.hash}`);
    return true;
  }

  return false;
}
