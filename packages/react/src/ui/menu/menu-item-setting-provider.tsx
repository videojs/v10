'use client';

import type { ReactNode } from 'react';

import { MenuItemSettingContextProvider } from './context';
import type { MenuItemSettingType } from './menu-item-type';
import { useMenuItemSetting } from './use-menu-item-setting';

export interface MenuItemSettingProviderProps {
  type: MenuItemSettingType;
  children: ReactNode;
}

export function MenuItemSettingProvider({ type, children }: MenuItemSettingProviderProps): ReactNode {
  const setting = useMenuItemSetting(type);

  if (!setting) return children;

  return <MenuItemSettingContextProvider value={setting}>{children}</MenuItemSettingContextProvider>;
}
