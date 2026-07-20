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
