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
