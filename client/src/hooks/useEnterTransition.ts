/**
 * Per-item stagger for chart marks, capped so a long list never feels slow to
 * finish.
 *
 * Paired with the `animate-bar-x` / `animate-bar-y` keyframes, which declare
 * only a `from` state so the element's authored size is the implicit end. That
 * combination keeps the animation purely additive: the delay holds a mark at
 * zero before its turn, and if animations never run the mark is simply drawn at
 * its real size.
 */
export function staggerDelay(index: number, stepMs = 55, maxMs = 400): number {
  return Math.min(index * stepMs, maxMs);
}
