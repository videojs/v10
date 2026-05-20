import type { MenuState, StateAttrMap } from '@videojs/core';
import type { MenuApi, NavigationState } from '@videojs/core/dom';
import { createContext } from '@videojs/element/context';

/** Value carried on `menuContext` — the menu API, current state, and roving-focus navigation handle. */
export interface MenuContextValue {
  /** Menu controller — provides imperative open/close/select calls. */
  menu: MenuApi;
  /** Current menu state propagated to descendants for `data-*` reflection. */
  state: MenuState;
  /** Maps state keys to `data-*` attribute names. */
  stateAttrMap: StateAttrMap<MenuState>;
  /** Roving-focus navigation state shared with menu items. */
  navigation: NavigationState;
  /** The parent menu's API — set by nested submenus for pop-on-select behavior. */
  parentMenu: MenuApi | null;
}

/** Value carried on `menuRadioGroupContext` — selected value and a setter for `<media-menu-radio-item>` children. */
export interface MenuRadioGroupContextValue {
  /** Currently selected radio value. */
  value: string;
  /** Called by a radio item when the user selects it. */
  onValueChange: (value: string) => void;
}

const MENU_CONTEXT_KEY = Symbol('@videojs/menu');
const MENU_RADIO_GROUP_CONTEXT_KEY = Symbol('@videojs/menu-radio-group');

/** Context broadcast by `<media-menu>` to its descendants. */
export const menuContext = createContext<MenuContextValue>(MENU_CONTEXT_KEY);
/** Context broadcast by `<media-menu-radio-group>` to its radio item children. */
export const menuRadioGroupContext = createContext<MenuRadioGroupContextValue>(MENU_RADIO_GROUP_CONTEXT_KEY);
