import type { MenuState, StateAttrMap } from '@videojs/core';
import type { MenuApi, NavigationState } from '@videojs/core/dom';
import { createContext } from '@videojs/element/context';

import type { MenuItemSettingType } from './menu-item-type';

export interface MenuContextValue {
  menu: MenuApi;
  state: MenuState;
  stateAttrMap: StateAttrMap<MenuState>;
  navigation: NavigationState;
  /** The parent menu's API — set by nested submenus for pop-on-select behavior. */
  parentMenu: MenuApi | null;
}

export interface MenuGroupContextValue {
  registerLabel: (id: string) => () => void;
}

export interface MenuItemSettingContextValue {
  type: MenuItemSettingType;
  label: string;
  availability: 'available' | 'unavailable';
}

const MENU_CONTEXT_KEY = Symbol('@videojs/menu');
const MENU_GROUP_CONTEXT_KEY = Symbol('@videojs/menu-group');
const MENU_ITEM_SETTING_CONTEXT_KEY = Symbol('@videojs/menu-item-setting');

export const menuContext = createContext<MenuContextValue>(MENU_CONTEXT_KEY);
export const menuGroupContext = createContext<MenuGroupContextValue>(MENU_GROUP_CONTEXT_KEY);
export const menuItemSettingContext = createContext<MenuItemSettingContextValue | undefined>(
  MENU_ITEM_SETTING_CONTEXT_KEY
);

export {
  type RadioGroupContextValue as MenuRadioGroupContextValue,
  radioGroupContext as menuRadioGroupContext,
} from '../radio-group/context';
