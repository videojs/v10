'use client';

import type { MenuState } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext, useOptionalMenuItemSettingContext } from './context';

export interface MenuItemValueProps extends UIComponentProps<'span', MenuState> {}

/** Displays the current value for a settings menu item from `Menu.Item` or `Menu.Trigger` context. */
export const MenuItemValue = forwardRef<HTMLSpanElement, MenuItemValueProps>(function MenuItemValue(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { state, stateAttrMap } = useMenuContext();
  const setting = useOptionalMenuItemSettingContext();
  if (!setting) return null;

  return renderElement(
    'span',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: forwardedRef,
      props: [{ 'aria-live': 'off' as const, children: setting.label }, elementProps],
    }
  );
});

export namespace MenuItemValue {
  export type Props = MenuItemValueProps;
}
