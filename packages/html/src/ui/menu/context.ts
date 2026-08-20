import type { MenuState, StateAttrMap } from '@videojs/core';
import type { MenuApi } from '@videojs/core/dom';
import { createContext } from '@videojs/element/context';

export interface MenuTriggerState {
  hint: string;
  disabled: boolean;
  availability?: 'available' | 'unavailable' | 'unsupported' | undefined;
}

export interface MenuContextValue {
  menu: MenuApi;
  state: MenuState;
  stateAttrMap: StateAttrMap<MenuState>;
  /** Publish display and interaction state to this submenu's trigger. */
  setTriggerState: (state: MenuTriggerState) => void;
}

export interface MenuGroupContextValue {
  registerLabel: (id: string) => () => void;
}

const MENU_CONTEXT_KEY = Symbol('@videojs/menu');
const MENU_GROUP_CONTEXT_KEY = Symbol('@videojs/menu-group');

export const menuContext = createContext<MenuContextValue>(MENU_CONTEXT_KEY);
export const menuGroupContext = createContext<MenuGroupContextValue>(MENU_GROUP_CONTEXT_KEY);

export {
  type RadioGroupContextValue as MenuRadioGroupContextValue,
  radioGroupContext as menuRadioGroupContext,
} from '../radio-group/context';
