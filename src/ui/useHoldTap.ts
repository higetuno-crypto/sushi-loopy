import { useEffect, useLayoutEffect, useRef } from 'react';
import type { PointerEvent } from 'react';

/** Immediate press, then four servings per second; never catch up after leaving. */
export function useHoldTap(tap: () => void, active = true) {
  const latest = useRef(tap);
  useLayoutEffect(() => { latest.current = tap; });
  const pointer = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    pointer.current = null;
  };
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', hide);
    if (!active) stop();
    return () => {
      stop();
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [active]);
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current === event.pointerId) stop();
  };
  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (!active || !event.isPrimary || event.button !== 0 || pointer.current !== null) return;
      event.preventDefault();
      pointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      latest.current();
      timer.current = setInterval(() => latest.current(), 250);
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
    onClick(event: React.MouseEvent<HTMLButtonElement>) {
      // Keyboard and assistive-technology activation has no pointer press.
      if (active && event.detail === 0) latest.current();
    },
    onContextMenu(event: React.MouseEvent<HTMLButtonElement>) { event.preventDefault(); },
  };
}
