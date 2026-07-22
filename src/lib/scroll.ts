const PROFILE_SCROLL_KEY = 'hallaqi-profile-scroll-y';

export function saveProfileScrollPosition(): void {
  try {
    sessionStorage.setItem(PROFILE_SCROLL_KEY, String(window.scrollY));
  } catch {
    /* ignore */
  }
}

export function restoreProfileScrollPosition(): void {
  try {
    const y = Number.parseInt(sessionStorage.getItem(PROFILE_SCROLL_KEY) || '0', 10);
    if (!Number.isFinite(y) || y <= 0) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    });
  } catch {
    /* ignore */
  }
}

/** Scroll the window to the top — call on every screen/tab change. */
export function scrollToTop(behavior: ScrollBehavior = 'instant'): void {
  try {
    window.scrollTo({ top: 0, left: 0, behavior });
  } catch {
    window.scrollTo(0, 0);
  }
  try {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  } catch {
    // ignore
  }
}
