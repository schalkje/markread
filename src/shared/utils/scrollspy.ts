/**
 * Scrollspy rules (issue #25)
 *
 * Pure decision logic used by `useScrollSpy`:
 * - an activation line near the top of the viewport
 * - the last heading that crossed the line is active; the previous heading
 *   stays active across gaps between headings
 * - at the very bottom of a scrollable container the last heading is forced
 *   active even if it can never reach the line
 */

/** Fraction of the viewport height the activation line sits at, capped in px */
const ACTIVATION_FRACTION = 0.3;
const ACTIVATION_MAX_PX = 160;
/** Tolerance for rounding in scroll metrics */
const BOTTOM_TOLERANCE_PX = 2;
/** Small tolerance so a heading scrolled exactly onto the line counts as crossed */
const LINE_TOLERANCE_PX = 1;

export function computeActivationLine(clientHeight: number): number {
  return Math.min(clientHeight * ACTIVATION_FRACTION, ACTIVATION_MAX_PX);
}

/**
 * True when the container is scrollable and scrolled to its end.
 * A document that fits without scrolling is never "at the bottom".
 */
export function isScrolledToBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  tolerance: number = BOTTOM_TOLERANCE_PX
): boolean {
  if (scrollHeight <= clientHeight + tolerance) return false;
  return scrollTop + clientHeight >= scrollHeight - tolerance;
}

/**
 * Pick the active heading.
 * @param tops heading tops relative to the container's viewport top, in document order
 * @param activationLine px from the container top
 * @param atBottom result of `isScrolledToBottom`
 * @returns index into `tops`, or -1 when no heading has crossed the line yet
 */
export function resolveActiveIndex(tops: readonly number[], activationLine: number, atBottom: boolean): number {
  if (tops.length === 0) return -1;
  if (atBottom) return tops.length - 1;

  let active = -1;
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] <= activationLine + LINE_TOLERANCE_PX) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}
