'use client';

import type { MenuState } from '@videojs/core';
import { getMenuRootViewAttrs } from '@videojs/core/dom';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext } from './context';

export interface MenuViewProps extends UIComponentProps<'div', MenuState> {}

/** Root menu view inside the menu viewport. */
export const MenuView = forwardRef<HTMLDivElement, MenuViewProps>(function MenuView(
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
      props: [getMenuRootViewAttrs(), elementProps],
    }
  );
});

export namespace MenuView {
  export type Props = MenuViewProps;
  export type State = MenuState;
}
