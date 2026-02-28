import { supportsAnchorPositioning } from '@videojs/utils/dom';
import type { PopoverAlign, PopoverSide } from '../../../core/ui/popover/popover-core';
import { type PopoverCSSVarKey, PopoverCSSVars } from '../../../core/ui/popover/popover-css-vars';

export interface PositioningOptions {
  side: PopoverSide;
  align: PopoverAlign;
}

export interface ManualOffsets {
  sideOffset: number;
  alignOffset: number;
}

export interface PopoverPositionStyle {
  [key: string]: string | undefined;
  positionAnchor?: string;
  position?: string;
  inset?: string;
  margin?: string;
  justifySelf?: string;
  alignSelf?: string;
  marginInlineStart?: string;
  marginBlockStart?: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

const OPPOSITE_SIDE: Record<PopoverSide, PopoverSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/**
 * Get positioning styles for the popup element.
 *
 * When the browser supports CSS Anchor Positioning, returns native CSS properties
 * that reference `var(--media-popover-side-offset, 0px)` and
 * `var(--media-popover-align-offset, 0px)` — no JS offset values needed.
 *
 * When rects are provided and anchor positioning is unsupported, falls back to
 * manual JS-computed positioning. The caller must resolve offset CSS vars via
 * `getComputedStyle` and pass them as `offsets`.
 *
 * Returns camelCase keys for standard CSS properties and `--*` keys for
 * custom properties — compatible with both React's `style` prop and
 * `applyStyles()` from `@videojs/utils/dom`.
 */
export function getAnchorPositionStyle(
  anchorName: string,
  opts: PositioningOptions,
  triggerRect?: DOMRect,
  popupRect?: DOMRect,
  boundaryRect?: DOMRect,
  offsets?: ManualOffsets
): PopoverPositionStyle & Partial<Record<PopoverCSSVarKey, string>> {
  if (supportsAnchorPositioning()) {
    return getAnchorPositionCSS(anchorName, opts);
  }

  // JS fallback when CSS Anchor Positioning is not supported.
  if (triggerRect && popupRect) {
    const resolved: ManualOffsets = offsets ?? { sideOffset: 0, alignOffset: 0 };
    return {
      ...getManualPositionStyle(triggerRect, popupRect, opts, resolved),
      ...(boundaryRect ? getPopoverCSSVars(triggerRect, boundaryRect, opts.side) : {}),
      position: 'fixed',
      // Reset UA [popover] defaults (inset: 0; margin: auto) which would
      // otherwise conflict with computed positioning.
      inset: 'auto',
      margin: '0',
    };
  }

  return {};
}

/** Generate style to set on the trigger for CSS Anchor Positioning. */
export function getAnchorNameStyle(anchorName: string) {
  if (!supportsAnchorPositioning()) return {};
  return { anchorName: `--${anchorName}` };
}

const SIDE_OFFSET_VAR = `var(${PopoverCSSVars.sideOffset}, 0px)`;
const ALIGN_OFFSET_VAR = `var(${PopoverCSSVars.alignOffset}, 0px)`;

function getAnchorPositionCSS(anchorName: string, opts: PositioningOptions): PopoverPositionStyle {
  const { side, align } = opts;
  const style: PopoverPositionStyle = {
    positionAnchor: `--${anchorName}`,
    position: 'fixed',
    // Reset UA [popover] defaults (inset: 0; margin: auto) and any
    // stale properties from a previous side/align configuration.
    // applyStyles() only sets properties — it never removes old ones —
    // so we emit a complete set of resets every time.
    inset: 'auto',
    margin: '0',
    justifySelf: 'normal',
    alignSelf: 'normal',
    marginInlineStart: '0',
    marginBlockStart: '0',
  };

  // The CSS inset property is the OPPOSITE of the desired side.
  // e.g. side='top' → set `bottom: anchor(top)` so the popover's
  // bottom edge aligns with the anchor's top edge (placing it above).
  const insetProp = OPPOSITE_SIDE[side];

  // Side positioning — always use calc() with the CSS var so the offset
  // is resolved at paint time without any JS round-trip.
  if (side === 'top' || side === 'bottom') {
    style[insetProp] = `calc(anchor(${side}) + ${SIDE_OFFSET_VAR})`;

    // Alignment along the cross axis
    if (align === 'start') {
      style.left = `calc(anchor(left) + ${ALIGN_OFFSET_VAR})`;
    } else if (align === 'end') {
      style.right = `calc(anchor(right) + ${ALIGN_OFFSET_VAR})`;
    } else {
      style.justifySelf = 'anchor-center';
      style.marginInlineStart = ALIGN_OFFSET_VAR;
    }
  } else {
    style[insetProp] = `calc(anchor(${side}) + ${SIDE_OFFSET_VAR})`;

    if (align === 'start') {
      style.top = `calc(anchor(top) + ${ALIGN_OFFSET_VAR})`;
    } else if (align === 'end') {
      style.bottom = `calc(anchor(bottom) + ${ALIGN_OFFSET_VAR})`;
    } else {
      style.alignSelf = 'anchor-center';
      style.marginBlockStart = ALIGN_OFFSET_VAR;
    }
  }

  return style;
}

/**
 * Compute CSS variables for the popup element.
 *
 * These enable CSS-based sizing constraints relative to the anchor/boundary.
 */
export function getPopoverCSSVars(
  triggerRect: DOMRect,
  boundaryRect: DOMRect,
  side: PopoverSide
): Partial<Record<PopoverCSSVarKey, string>> {
  const vars: Partial<Record<PopoverCSSVarKey, string>> = {};

  vars[PopoverCSSVars.anchorWidth] = `${triggerRect.width}px`;
  vars[PopoverCSSVars.anchorHeight] = `${triggerRect.height}px`;

  if (side === 'top' || side === 'bottom') {
    vars[PopoverCSSVars.availableHeight] =
      side === 'top' ? `${triggerRect.top - boundaryRect.top}px` : `${boundaryRect.bottom - triggerRect.bottom}px`;
    vars[PopoverCSSVars.availableWidth] = `${boundaryRect.width}px`;
  } else {
    vars[PopoverCSSVars.availableWidth] =
      side === 'left' ? `${triggerRect.left - boundaryRect.left}px` : `${boundaryRect.right - triggerRect.right}px`;
    vars[PopoverCSSVars.availableHeight] = `${boundaryRect.height}px`;
  }

  return vars;
}

/**
 * Compute manual positioning when CSS Anchor Positioning is not supported.
 *
 * Returns inline `top`/`left` styles in **viewport coordinates** for use
 * with `position: fixed` (the popup is in the top layer). All rects from
 * `getBoundingClientRect()` are already viewport-relative.
 *
 * Offsets are resolved by the caller from CSS custom properties via
 * `getComputedStyle()` and passed as `offsets`.
 */
export function getManualPositionStyle(
  triggerRect: DOMRect,
  popupRect: DOMRect,
  opts: PositioningOptions,
  offsets: ManualOffsets = { sideOffset: 0, alignOffset: 0 }
) {
  const { side, align } = opts;
  const { sideOffset, alignOffset } = offsets;
  let top = 0;
  let left = 0;

  // Side positioning in viewport coordinates.
  // Positive sideOffset always increases distance from the trigger.
  if (side === 'top') {
    top = triggerRect.top - popupRect.height - sideOffset;
  } else if (side === 'bottom') {
    top = triggerRect.bottom + sideOffset;
  } else if (side === 'left') {
    left = triggerRect.left - popupRect.width - sideOffset;
  } else {
    left = triggerRect.right + sideOffset;
  }

  // Alignment along cross axis
  if (side === 'top' || side === 'bottom') {
    if (align === 'start') {
      left = triggerRect.left + alignOffset;
    } else if (align === 'end') {
      left = triggerRect.right - popupRect.width + alignOffset;
    } else {
      left = triggerRect.left + (triggerRect.width - popupRect.width) / 2 + alignOffset;
    }
  } else {
    if (align === 'start') {
      top = triggerRect.top + alignOffset;
    } else if (align === 'end') {
      top = triggerRect.bottom - popupRect.height + alignOffset;
    } else {
      top = triggerRect.top + (triggerRect.height - popupRect.height) / 2 + alignOffset;
    }
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
  };
}

/**
 * Read `--media-popover-side-offset` and `--media-popover-align-offset`
 * from the popup element's computed style, returning numeric pixel values.
 */
export function resolveOffsets(el: Element): ManualOffsets {
  const computed = getComputedStyle(el);
  return {
    sideOffset: Number.parseFloat(computed.getPropertyValue(PopoverCSSVars.sideOffset)) || 0,
    alignOffset: Number.parseFloat(computed.getPropertyValue(PopoverCSSVars.alignOffset)) || 0,
  };
}
