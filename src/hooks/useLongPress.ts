import { useCallback, useRef, useState } from 'react';

/** Distinguishes tap vs long-press without blocking the click handler. */
export function useLongPress(onLongPress: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const [pressed, setPressed] = useState(false);

  const clear = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setPressed(false);
  }, []);

  const onPointerDown = useCallback(() => {
    longPressed.current = false;
    setPressed(true);
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      onLongPress();
      setPressed(false);
    }, ms);
  }, [ms, onLongPress]);

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const didLongPress = useCallback(() => longPressed.current, []);

  return { onPointerDown, onPointerUp, onPointerLeave: clear, onPointerCancel: clear, pressed, didLongPress };
}
