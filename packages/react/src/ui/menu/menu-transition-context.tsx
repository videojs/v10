'use client';

import type { MenuTransitionApi, MenuTransitionViewApi } from '@videojs/core/dom';
import { createContext, useContext } from 'react';
import type { MenuContextValue } from './context';

export interface MenuTransitionRootContextValue {
  controller: MenuTransitionApi;
  parentMenu: MenuContextValue;
  container: HTMLElement | null;
}

const MenuTransitionRootContext = createContext<MenuTransitionRootContextValue | null>(null);
const MenuTransitionViewContext = createContext<MenuTransitionViewApi | null>(null);

export const MenuTransitionRootContextProvider = MenuTransitionRootContext.Provider;
export const MenuTransitionViewContextProvider = MenuTransitionViewContext.Provider;

export function useMenuTransitionRootContext(): MenuTransitionRootContextValue {
  const context = useContext(MenuTransitionRootContext);
  if (!context) throw new Error('Menu.TransitionView must be used within Menu.TransitionRoot');
  return context;
}

export function useOptionalMenuTransitionViewContext(): MenuTransitionViewApi | null {
  return useContext(MenuTransitionViewContext);
}
