export type GestureRegion = 'left' | 'center' | 'right';

/**
 * Determine which named region a pointer position falls into.
 *
 * Regions divide the container width equally based on how many are active:
 * - `left` + `right` → halves (50% / 50%)
 * - `left` + `center` + `right` → thirds (33% / 34% / 33%)
 */
export function resolveRegion(
  clientX: number,
  containerRect: DOMRect,
  activeRegions: ReadonlySet<GestureRegion>
): GestureRegion | null {
  if (activeRegions.size === 0) return null;

  const relativeX = clientX - containerRect.left;
  const width = containerRect.width;

  if (width === 0) return null;

  const ratio = relativeX / width;

  if (activeRegions.size === 2 && activeRegions.has('left') && activeRegions.has('right')) {
    return ratio < 0.5 ? 'left' : 'right';
  }

  if (activeRegions.size === 3) {
    if (ratio < 1 / 3) return 'left';
    if (ratio < 2 / 3) return 'center';
    return 'right';
  }

  // Single region or partial combinations — match the first one that contains the pointer.
  if (activeRegions.has('left') && ratio < 0.5) return 'left';
  if (activeRegions.has('right') && ratio >= 0.5) return 'right';
  if (activeRegions.has('center')) return 'center';

  return null;
}
