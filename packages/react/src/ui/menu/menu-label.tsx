'use client';

import type { MenuState } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext } from './context';

export interface MenuLabelProps extends UIComponentProps<'div', MenuState> {}

/** Non-interactive label for a group of items. Renders a `<div>`. */
export const MenuLabel = forwardRef<HTMLDivElement, MenuLabelProps>(function MenuLabel(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { state } = useMenuContext();

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      ref: [forwardedRef],
      props: [elementProps],
    }
  );
});

export namespace MenuLabel {
  export type Props = MenuLabelProps;
  export type State = MenuState;
}
