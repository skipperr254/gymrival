/**
 * Feed media sizing. A post's media area is full screen width, so its height is
 * driven entirely by aspect ratio (width / height). Portrait media is capped at
 * 4:5 (Instagram's feed cap — guarantees a post always fits comfortably on
 * screen) and landscape is floored at 16:9. The video renders with
 * contentFit="cover", so out-of-range media is center-cropped.
 */
export const DEFAULT_FEED_RATIO = 4 / 5;
export const MIN_FEED_RATIO = 4 / 5; // portrait cap (tallest allowed)
export const MAX_FEED_RATIO = 16 / 9; // landscape floor (widest allowed)

/** Clamped display ratio from stored video dimensions, or null when unknown. */
export function clampFeedRatio(
  width: number | null | undefined,
  height: number | null | undefined
): number | null {
  if (!width || !height) return null;
  return Math.min(Math.max(width / height, MIN_FEED_RATIO), MAX_FEED_RATIO);
}
