import { supportsAnchorPositioning } from '@videojs/utils/dom';
import type { PopoverAlign, PopoverSide } from '../../../core/ui/popover/popover-core';
import { PopoverCSSVars } from '../../../core/ui/popover/popover-css-vars';

export interface PositioningOptions {
  side: PopoverSide;
  align: PopoverAlign;
  sideOffset: number;
  alignOffset: number;
}

const OPPOSITE_SIDE: Record<PopoverSide, PopoverSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

let _supportsAnchorPositioning: boolean | null = null;

function detectAnchorPositioning(): boolean {
  if (_supportsAnchorPositioning === null) {
    _supportsAnchorPositioning = supportsAnchorPositioning();
  }
  return _supportsAnchorPositioning;
}

/**
 * Get positioning styles for the positioner element.
 *
 * When the browser supports CSS Anchor Positioning, returns native CSS properties.
 * When rects are provided and anchor positioning is unsupported, falls back to
 * manual JS-computed positioning via CSS custom properties.
 */
export function getAnchorPositionStyle(
  anchorName: string,
  opts: PositioningOptions,
  triggerRect?: DOMRect,
  positionerRect?: DOMRect,
  boundaryRect?: DOMRect
): Record<string, string> {
  if (detectAnchorPositioning()) {
    return getAnchorPositionCSS(anchorName, opts);
  }

  // JS fallback when CSS Anchor Positioning is not supported.
  if (triggerRect && positionerRect) {
    return {
      ...getManualPositionStyle(triggerRect, positionerRect, opts),
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
export function getAnchorNameStyle(anchorName: string): Record<string, string> {
  if (!detectAnchorPositioning()) return {};
  return { 'anchor-name': `--${anchorName}` };
}

function getAnchorPositionCSS(anchorName: string, opts: PositioningOptions): Record<string, string> {
  const { side, align, sideOffset, alignOffset } = opts;
  const style: Record<string, string> = {
    'position-anchor': `--${anchorName}`,
    position: 'fixed',
    // Reset UA [popover] defaults (inset: 0; margin: auto) and any
    // stale properties from a previous side/align configuration.
    // applyStyles() only sets properties — it never removes old ones —
    // so we emit a complete set of resets every time.
    inset: 'auto',
    margin: '0',
    'justify-self': 'normal',
    'align-self': 'normal',
    'margin-inline-start': '0',
    'margin-block-start': '0',
  };

  // The CSS inset property is the OPPOSITE of the desired side.
  // e.g. side='top' → set `bottom: anchor(top)` so the popover's
  // bottom edge aligns with the anchor's top edge (placing it above).
  const insetProp = OPPOSITE_SIDE[side];

  // Side positioning
  if (side === 'top' || side === 'bottom') {
    style[insetProp] = sideOffset ? `calc(anchor(${side}) + ${sideOffset}px)` : `anchor(${side})`;

    // Alignment along the cross axis
    if (align === 'start') {
      style.left = alignOffset ? `calc(anchor(left) + ${alignOffset}px)` : 'anchor(left)';
    } else if (align === 'end') {
      style.right = alignOffset ? `calc(anchor(right) + ${alignOffset}px)` : 'anchor(right)';
    } else {
      style['justify-self'] = 'anchor-center';
      if (alignOffset) style['margin-inline-start'] = `${alignOffset}px`;
    }
  } else {
    style[insetProp] = sideOffset ? `calc(anchor(${side}) + ${sideOffset}px)` : `anchor(${side})`;

    if (align === 'start') {
      style.top = alignOffset ? `calc(anchor(top) + ${alignOffset}px)` : 'anchor(top)';
    } else if (align === 'end') {
      style.bottom = alignOffset ? `calc(anchor(bottom) + ${alignOffset}px)` : 'anchor(bottom)';
    } else {
      style['align-self'] = 'anchor-center';
      if (alignOffset) style['margin-block-start'] = `${alignOffset}px`;
    }
  }

  return style;
}

/**
 * Compute CSS variables for the positioner element.
 *
 * These enable CSS-based sizing constraints relative to the anchor/boundary.
 */
export function getPopoverCSSVars(
  triggerRect: DOMRect,
  boundaryRect: DOMRect,
  side: PopoverSide
): Record<string, string> {
  const vars: Record<string, string> = {};

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
 */
export function getManualPositionStyle(
  triggerRect: DOMRect,
  popupRect: DOMRect,
  opts: PositioningOptions
): Record<string, string> {
  const { side, align, sideOffset, alignOffset } = opts;
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
