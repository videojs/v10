import { TransitionDataAttrs } from '../transition';
import type { StateAttrMap } from '../types';
import type { MenuState } from './menu-core';

/** Data attributes shared by menu parts. Panel-specific attrs are applied directly to the panel. */
export const MenuDataAttrs = {
  /** Present when the menu is open. */
  open: 'data-open',
  /** Popover positioning side. Absent on submenus. */
  side: 'data-side',
  /** Popover positioning alignment. Absent on submenus. */
  align: 'data-align',
  ...TransitionDataAttrs,
} as const satisfies StateAttrMap<MenuState>;
