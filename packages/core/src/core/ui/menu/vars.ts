/** CSS custom property names for menu layout and positioning. */
export const MenuCSSVars = {
  /** Distance between the popup and the trigger along the side axis. */
  sideOffset: '--media-popover-side-offset',
  /** Distance between the popup and the trigger along the alignment axis. */
  alignOffset: '--media-popover-align-offset',
  /** Minimum distance between the popup and the positioning boundary. */
  boundaryOffset: '--media-popover-boundary-offset',
  /** The anchor element's width. */
  anchorWidth: '--media-popover-anchor-width',
  /** The anchor element's height. */
  anchorHeight: '--media-popover-anchor-height',
  /** Width of the active menu panel (px). */
  width: '--media-menu-width',
  /** Height of the active menu panel (px). */
  height: '--media-menu-height',
  /** Viewport-constrained max width for the menu (px). */
  availableWidth: '--media-menu-available-width',
  /** Viewport-constrained max height for the menu (px). */
  availableHeight: '--media-menu-available-height',
} as const;
