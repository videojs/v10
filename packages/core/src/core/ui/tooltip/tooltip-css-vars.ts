export const TooltipCSSVars = {
  /** Distance between the popup and the trigger along the side axis. */
  sideOffset: '--media-tooltip-side-offset',
  /** Distance between the popup and the trigger along the alignment axis. */
  alignOffset: '--media-tooltip-align-offset',
  /** The anchor element's width. */
  anchorWidth: '--media-tooltip-anchor-width',
  /** The anchor element's height. */
  anchorHeight: '--media-tooltip-anchor-height',
  /** Available width between the trigger and the boundary edge. */
  availableWidth: '--media-tooltip-available-width',
  /** Available height between the trigger and the boundary edge. */
  availableHeight: '--media-tooltip-available-height',
} as const;

export type TooltipCSSVarKey = (typeof TooltipCSSVars)[keyof typeof TooltipCSSVars];
