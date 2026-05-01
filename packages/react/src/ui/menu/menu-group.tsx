'use client';

import type { MenuState } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext } from './context';

export interface MenuGroupProps extends UIComponentProps<'div', MenuState> {
  /** Accessible label for the group. */
  label?: string;
}

/** Groups related menu items. Renders a `<div>` with `role="group"`. */
export const MenuGroup = forwardRef<HTMLDivElement, MenuGroupProps>(function MenuGroup(
  { render, className, style, label, ...elementProps },
  forwardedRef
) {
  const { state, stateAttrMap } = useMenuContext();

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: [forwardedRef],
      props: [{ role: 'group' as const, 'aria-label': label }, elementProps],
    }
  );
});

export namespace MenuGroup {
  export type Props = MenuGroupProps;
  export type State = MenuState;
}
