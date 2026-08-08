import { TransitionDataAttrs } from '../transition';
import type { StateAttrMap } from '../types';
import type { MenuState } from './menu-core';

/** Data attributes set on the menu Content element and inherited by all children. */
export const MenuDataAttrs = {
  /** Present when the menu is open. */
  open: 'data-open',
  /** Rendered positioning side after collision handling. */
  side: 'data-side',
  /** Popover positioning alignment. */
  align: 'data-align',
  /** Present on Content when this menu is bound as a submenu. */
  isSubmenu: 'data-submenu',
  ...TransitionDataAttrs,
} as const satisfies StateAttrMap<MenuState>;
