import { supportsAnchorPositioning } from '@videojs/utils/dom';
import type { PopoverAlign, PopoverSide } from '../../../core/ui/popover/popover-core';
import { PopoverCSSVars } from '../../../core/ui/popover/popover-css-vars';

export interface PositioningOptions {
  side: PopoverSide;
  align: PopoverAlign;
  sideOffset: number;
  alignOffset: number;
}

export interface PositioningResult {
  positionerStyle: Record<string, string>;
  cssVars: Record<string, string>;
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
 * Get CSS Anchor Positioning styles for the positioner element.
 *
 * When the browser supports CSS Anchor Positioning, returns native CSS properties.
 * Otherwise returns manual positioning based on bounding rects.
 */
export function getAnchorPositionStyle(anchorName: string, opts: PositioningOptions): Record<string, string> {
  if (detectAnchorPositioning()) {
    return getAnchorPositionCSS(anchorName, opts);
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
  };

  const anchorSide = OPPOSITE_SIDE[side];

  // Side positioning
  if (side === 'top' || side === 'bottom') {
    style[side] = sideOffset ? `calc(anchor(${anchorSide}) + ${sideOffset}px)` : `anchor(${anchorSide})`;

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
    style[side] = sideOffset ? `calc(anchor(${anchorSide}) + ${sideOffset}px)` : `anchor(${anchorSide})`;

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
 * Compute manual positioning CSS variables when CSS Anchor Positioning is not supported.
 *
 * Returns CSS custom properties that should be set on the positioner element.
 * The consumer's CSS handles the actual positioning (e.g. `position: absolute;
 * top: var(--popover-top); left: var(--popover-left)`).
 */
export function getManualPositionStyle(
  triggerRect: DOMRect,
  positionerRect: DOMRect,
  boundaryRect: DOMRect,
  opts: PositioningOptions
): Record<string, string> {
  const { side, align, sideOffset, alignOffset } = opts;
  let top = 0;
  let left = 0;

  // Side positioning (relative to boundary)
  if (side === 'top') {
    top = triggerRect.top - boundaryRect.top - positionerRect.height - sideOffset;
  } else if (side === 'bottom') {
    top = triggerRect.bottom - boundaryRect.top + sideOffset;
  } else if (side === 'left') {
    left = triggerRect.left - boundaryRect.left - positionerRect.width - sideOffset;
  } else {
    left = triggerRect.right - boundaryRect.left + sideOffset;
  }

  // Alignment along cross axis
  if (side === 'top' || side === 'bottom') {
    if (align === 'start') {
      left = triggerRect.left - boundaryRect.left + alignOffset;
    } else if (align === 'end') {
      left = triggerRect.right - boundaryRect.left - positionerRect.width + alignOffset;
    } else {
      left = triggerRect.left - boundaryRect.left + (triggerRect.width - positionerRect.width) / 2 + alignOffset;
    }
  } else {
    if (align === 'start') {
      top = triggerRect.top - boundaryRect.top + alignOffset;
    } else if (align === 'end') {
      top = triggerRect.bottom - boundaryRect.top - positionerRect.height + alignOffset;
    } else {
      top = triggerRect.top - boundaryRect.top + (triggerRect.height - positionerRect.height) / 2 + alignOffset;
    }
  }

  return {
    [PopoverCSSVars.top]: `${top}px`,
    [PopoverCSSVars.left]: `${left}px`,
  };
}
