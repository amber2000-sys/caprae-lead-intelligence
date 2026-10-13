import { useEffect, useRef, useState } from 'react';

/** True when the viewer has asked the system for reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate a number up to its value on mount.
 *
 * Used only on the dashboard's headline counts, where the motion does one
 * useful thing: it tells the reader the figure was just computed for the
 * criteria they set, rather than being static page furniture.
 *
 * Three guards keep it from becoming decoration:
 *  - it respects `prefers-reduced-motion` and snaps straight to the value
 *  - it is driven by rAF with an eased curve, so it never blocks input
 *  - it always lands exactly on the target, never a rounded approximation
 */
export function useCountUp(target: number, durationMs = 650): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const frame = useRef<number>();

  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      // easeOutCubic — fast settle, no bounce.
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(progress === 1 ? target : Math.round(from + (target - from) * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return value;
}
