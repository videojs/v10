import { TransitionDataAttrs } from '../transition';
import type { StateAttrMap } from '../types';
import type { MenuState } from './menu-core';

/** Data attributes set on the menu Content element and inherited by all children. */
export const MenuDataAttrs = {
  /** Present when the menu is open. */
  open: 'data-open',
  /** Popover positioning side. Absent on submenus. */
  side: 'data-side',
  /** Popover positioning alignment. Absent on submenus. */
  align: 'data-align',
  /** Present on Content when this menu is nested inside a parent menu. */
  isSubmenu: 'data-submenu',
  ...TransitionDataAttrs,
} as const satisfies StateAttrMap<MenuState>;
