/** CSS custom property names for menu layout and submenu transitions. */
export const MenuCSSVars = {
  /** Width of the incoming submenu view (px). Set on root Content before each transition. */
  width: '--media-menu-width',
  /** Height of the incoming submenu view (px). Set on root Content before each transition. */
  height: '--media-menu-height',
  /** Viewport-constrained max width for the menu (px). Set from popover positioning. */
  availableWidth: '--media-menu-available-width',
  /** Viewport-constrained max height for the menu (px). Set from popover positioning. */
  availableHeight: '--media-menu-available-height',
} as const;
