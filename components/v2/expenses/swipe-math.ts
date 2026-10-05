export const SWIPE_OPEN = 72
export const SWIPE_THRESHOLD = 40

/** Resolves the resting offset (px) after a released horizontal swipe. */
export function nextOffset(startX: number, currentX: number, open: number): number {
  const dx = currentX - startX
  if (open !== 0) {
    if (Math.abs(dx) < SWIPE_THRESHOLD) return 0
    return dx < 0 ? -SWIPE_OPEN : SWIPE_OPEN
  }
  if (dx <= -SWIPE_THRESHOLD) return -SWIPE_OPEN
  if (dx >= SWIPE_THRESHOLD) return SWIPE_OPEN
  return 0
}
