'use client';

import type { MenuState } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { MenuRadioGroupContextProvider, useMenuContext } from './context';

export interface MenuRadioGroupProps extends UIComponentProps<'div', MenuState> {
  /** The currently selected value. */
  value: string;
  /** Called when the user selects a radio item. */
  onValueChange: (value: string) => void;
  /** Accessible label for the group. */
  label?: string;
}

/** A group of mutually exclusive radio items. Renders a `<div>` with `role="group"`. */
export const MenuRadioGroup = forwardRef<HTMLDivElement, MenuRadioGroupProps>(function MenuRadioGroup(
  { render, className, style, value, onValueChange, label, ...elementProps },
  forwardedRef
) {
  const { state } = useMenuContext();

  return (
    <MenuRadioGroupContextProvider value={{ value, onValueChange }}>
      {renderElement(
        'div',
        { render, className, style },
        {
          state,
          ref: [forwardedRef],
          props: [{ role: 'group' as const, 'aria-label': label }, elementProps],
        }
      )}
    </MenuRadioGroupContextProvider>
  );
});

export namespace MenuRadioGroup {
  export type Props = MenuRadioGroupProps;
  export type State = MenuState;
}
