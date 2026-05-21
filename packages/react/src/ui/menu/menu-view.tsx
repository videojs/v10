'use client';

import type { MenuState } from '@videojs/core';
import { applyMenuViewTransitionAttrs, PERSISTENT_MENU_VIEW_RESTING_STATE } from '@videojs/core/dom';
import { createState } from '@videojs/store';
import { useSnapshot } from '@videojs/store/react';
import { forwardRef, useLayoutEffect, useRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { useMenuContext } from './context';

export interface MenuViewProps extends UIComponentProps<'div', MenuState> {}

/** Root menu view inside the menu viewport. */
export const MenuView = forwardRef<HTMLDivElement, MenuViewProps>(function MenuView(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { menu, state } = useMenuContext();
  const [restingRootTransitionInput] = useState(() => createState(PERSISTENT_MENU_VIEW_RESTING_STATE));
  const rootTransitionInput = menu.rootViewTransitionInput ?? restingRootTransitionInput;
  const rootTransitionState = useSnapshot(rootTransitionInput);
  const rootViewRef = useRef<HTMLDivElement | null>(null);
  const rootViewComposedRef = useComposedRefs(forwardedRef, rootViewRef);

  useLayoutEffect(() => {
    const element = rootViewRef.current;

    if (!element) return;

    applyMenuViewTransitionAttrs(element, rootTransitionState, { root: true, persistent: true });
  }, [rootTransitionState]);

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      ref: rootViewComposedRef,
      props: elementProps,
    }
  );
});

export namespace MenuView {
  export type Props = MenuViewProps;
  export type State = MenuState;
}
