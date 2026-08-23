import { TransitionDataAttrs } from '../transition';
import type { StateAttrMap } from '../types';
import type { MenuState } from './core';

/** Root popup state used for positioning and surface transitions. */
export const MenuPopupDataAttrs = {
  /** Present when the menu is open. */
  open: 'data-open',
  /** Rendered positioning side after collision handling. Absent on submenus. */
  side: 'data-side',
  /** Popover positioning alignment. Absent on submenus. */
  align: 'data-align',
  ...TransitionDataAttrs,
} as const satisfies StateAttrMap<MenuState>;

/** State for one root or nested menu page. */
export const MenuContentDataAttrs = {
  /** Present while this menu page is active or transitioning out. */
  open: 'data-open',
  /** Present on Content when this menu is nested inside a parent menu. */
  isSubmenu: 'data-submenu',
  ...TransitionDataAttrs,
} as const satisfies StateAttrMap<MenuState>;

/** Set to `true` while a child page is active and `false` while it exits. */
export const MenuSubmenuExpandedAttr = 'data-submenu-expanded';

/** All public Menu state attributes exposed to component transforms. */
export const MenuDataAttrs = {
  ...MenuPopupDataAttrs,
  ...MenuContentDataAttrs,
} as const satisfies StateAttrMap<MenuState>;
