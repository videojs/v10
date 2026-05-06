'use client';

import type { MenuCore, MenuState, StateAttrMap } from '@videojs/core';
import type { MenuApi } from '@videojs/core/dom';
import { createContext, useContext } from 'react';

export interface MenuContextValue {
  core: MenuCore;
  menu: MenuApi;
  state: MenuState;
  stateAttrMap: StateAttrMap<MenuState>;
  contentId: string;
  anchorName: string;
  /** ID of the currently visible submenu, or null when at root view. */
  activeSubMenuId: string | null;
  /** Triggerer ID of the active submenu entry (for focus restoration on pop). */
  activeSubMenuTriggerId: string | null;
  /** Direction of the most recent navigation. */
  navigationDirection: 'forward' | 'back';
  /** Push a submenu onto the navigation stack. */
  push: (menuId: string, triggerId: string) => void;
  /** Pop the current submenu from the navigation stack. */
  pop: () => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export const MenuContextProvider = MenuContext.Provider;

export function useMenuContext(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('Menu compound components must be used within a Menu.Root');
  return ctx;
}

export function useOptionalMenuContext(): MenuContextValue | null {
  return useContext(MenuContext);
}

// ---------------------------------------------------------------------------
// Sub-menu identity context — provided by a nested Menu.Root so child parts
// (Trigger, Content) can read the submenu ID and access the parent menu for
// push/pop and item registration.
// ---------------------------------------------------------------------------

export interface SubMenuContextValue {
  /** Stable ID for this submenu (matches the contentId of the nested Root). */
  subMenuId: string;
  /** The parent menu's context — used by Trigger to register and push. */
  parentMenu: MenuContextValue;
}

const SubMenuContext = createContext<SubMenuContextValue | null>(null);

export const SubMenuContextProvider = SubMenuContext.Provider;

export function useSubMenuContext(): SubMenuContextValue | null {
  return useContext(SubMenuContext);
}

// ---------------------------------------------------------------------------
// Radio group context — shared between MenuRadioGroup and MenuRadioItem
// ---------------------------------------------------------------------------

export interface MenuRadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const MenuRadioGroupContext = createContext<MenuRadioGroupContextValue | null>(null);

export const MenuRadioGroupContextProvider = MenuRadioGroupContext.Provider;

export function useMenuRadioGroupContext(): MenuRadioGroupContextValue {
  const ctx = useContext(MenuRadioGroupContext);
  if (!ctx) throw new Error('Menu.RadioItem must be used within a Menu.RadioGroup');
  return ctx;
}
