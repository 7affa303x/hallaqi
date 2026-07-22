import { useEffect } from 'react';
import { scrollToTop } from '@/lib/scroll';

/** Ensures internal sub-pages open at the top (fixes scroll-at-bottom glitches). */
export function useScrollToTopOnMount(): void {
  useEffect(() => {
    scrollToTop('instant');
  }, []);
}
