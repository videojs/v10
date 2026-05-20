import { isString } from '@videojs/utils/predicate';

/** Force a synchronous layout flush by reading `getBoundingClientRect`. */
export function forceLayout(element: HTMLElement | null): void {
  element?.getBoundingClientRect();
}

/** Allowed values for a positioning boundary reference. */
export type PositioningBoundary = 'viewport' | 'container' | (string & {}) | Element | null | undefined;

/** Options for {@link resolvePositioningBoundary}. */
export interface ResolvePositioningBoundaryOptions {
  /** Element to use when `boundary` is `'container'`. */
  container?: Element | null;
  /** Root to query when `boundary` is a CSS selector. */
  root?: Document | ShadowRoot | Element | null;
}

/**
 * Build a plain `DOMRect` from `left`/`top`/`width`/`height` values.
 *
 * @param left - Left edge.
 * @param top - Top edge.
 * @param width - Width.
 * @param height - Height.
 */
export function createDOMRect(left: number, top: number, width: number, height: number): DOMRect {
  const right = left + width;
  const bottom = top + height;

  return {
    x: left,
    y: top,
    width,
    height,
    top,
    right,
    bottom,
    left,
    toJSON() {
      return { x: left, y: top, width, height, top, right, bottom, left };
    },
  } as DOMRect;
}

/**
 * Compute the intersection rect of two `DOMRect`s, clamped to non-negative size.
 *
 * @param firstRect - First rect.
 * @param secondRect - Second rect.
 */
export function intersectDOMRects(firstRect: DOMRect, secondRect: DOMRect): DOMRect {
  const left = Math.max(firstRect.left, secondRect.left);
  const top = Math.max(firstRect.top, secondRect.top);
  const right = Math.min(firstRect.right, secondRect.right);
  const bottom = Math.min(firstRect.bottom, secondRect.bottom);

  return createDOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

/**
 * Get the positioning boundary rect — viewport, or `boundaryElement` clipped by the viewport.
 *
 * @param boundaryElement - Optional element to clip against.
 */
export function getPositioningBoundaryRect(boundaryElement?: Element | null): DOMRect {
  const viewportRect = document.documentElement.getBoundingClientRect();
  return boundaryElement ? intersectDOMRects(viewportRect, boundaryElement.getBoundingClientRect()) : viewportRect;
}

/**
 * Resolve a positioning boundary reference to a concrete element (or `null` for viewport).
 *
 * @param boundary - Element, selector, `'viewport'`, or `'container'`.
 * @param options - Container element and query root.
 */
export function resolvePositioningBoundary(
  boundary: PositioningBoundary,
  options: ResolvePositioningBoundaryOptions = {}
): Element | null {
  if (!boundary) return null;
  if (!isString(boundary)) return boundary;
  if (boundary === 'viewport') return null;
  if (boundary === 'container') return options.container ?? null;

  try {
    return (options.root ?? document).querySelector(boundary);
  } catch {
    return null;
  }
}
