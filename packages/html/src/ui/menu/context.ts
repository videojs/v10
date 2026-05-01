import type { MenuState, StateAttrMap } from '@videojs/core';
import type { MenuApi, NavigationState } from '@videojs/core/dom';
import { createContext } from '@videojs/element/context';

export interface MenuContextValue {
  menu: MenuApi;
  state: MenuState;
  stateAttrMap: StateAttrMap<MenuState>;
  navigation: NavigationState;
  /** The parent menu's API — set by nested submenus for pop-on-select behavior. */
  parentMenu: MenuApi | null;
}

export interface MenuRadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const MENU_CONTEXT_KEY = Symbol('@videojs/menu');
const MENU_RADIO_GROUP_CONTEXT_KEY = Symbol('@videojs/menu-radio-group');

export const menuContext = createContext<MenuContextValue>(MENU_CONTEXT_KEY);
export const menuRadioGroupContext = createContext<MenuRadioGroupContextValue>(MENU_RADIO_GROUP_CONTEXT_KEY);
