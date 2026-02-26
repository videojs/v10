export const PopoverCSSVars = {
  /** The anchor element's width. */
  anchorWidth: '--media-popover-anchor-width',
  /** The anchor element's height. */
  anchorHeight: '--media-popover-anchor-height',
  /** Available width between the trigger and the boundary edge. */
  availableWidth: '--media-popover-available-width',
  /** Available height between the trigger and the boundary edge. */
  availableHeight: '--media-popover-available-height',
  /** Transform origin computed from anchor position. */
  transformOrigin: '--media-popover-transform-origin',
  /** Computed top offset for manual positioning fallback. */
  top: '--media-popover-top',
  /** Computed left offset for manual positioning fallback. */
  left: '--media-popover-left',
} as const;
