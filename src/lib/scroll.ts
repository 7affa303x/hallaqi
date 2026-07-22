const PROFILE_SCROLL_KEY = 'hallaqi-profile-scroll-y';
const PROFILE_RESTORE_FLAG = 'hallaqi-restore-profile-scroll';

export function saveProfileScrollPosition(): void {
  try {
    sessionStorage.setItem(PROFILE_SCROLL_KEY, String(window.scrollY));
  } catch {
    /* ignore */
  }
}

export function markProfileScrollRestore(): void {
  try {
    sessionStorage.setItem(PROFILE_RESTORE_FLAG, '1');
  } catch {
    /* ignore */
  }
}

export function shouldRestoreProfileScroll(): boolean {
  try {
    return sessionStorage.getItem(PROFILE_RESTORE_FLAG) === '1';
  } catch {
    return false;
  }
}

export function clearProfileScrollRestore(): void {
  try {
    sessionStorage.removeItem(PROFILE_RESTORE_FLAG);
  } catch {
    /* ignore */
  }
}

export function restoreProfileScrollPosition(): void {
  try {
    const y = Number.parseInt(sessionStorage.getItem(PROFILE_SCROLL_KEY) || '0', 10);
    if (!Number.isFinite(y) || y <= 0) return;
    const apply = () => {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = y;
      document.body.scrollTop = y;
    };
    requestAnimationFrame(() => requestAnimationFrame(apply));
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
