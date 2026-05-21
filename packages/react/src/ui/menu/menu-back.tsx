'use client';

import type { MenuState } from '@videojs/core';
import { forwardRef, useCallback, useEffect, useRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext, useSubMenuContext } from './context';

export interface MenuBackProps extends UIComponentProps<'button', MenuState> {
  /** Accessible label for the back button. */
  label?: string;
}

/** Button that navigates back to the parent menu view. Place at the top of a submenu Content. */
export const MenuBack = forwardRef<HTMLButtonElement, MenuBackProps>(function MenuBack(
  { render, className, style, label = 'Back', onClick, ...elementProps },
  forwardedRef
) {
  const { menu, state, stateAttrMap } = useMenuContext();
  const subMenuCtx = useSubMenuContext();
  const parentMenu = subMenuCtx?.parentMenu ?? null;
  const elementRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    return menu.registerItem(element);
  }, [menu]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      parentMenu?.pop();
    },
    [onClick, parentMenu]
  );

  const handlePointerEnter = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    menu.highlight(element, { focus: false });
  }, [menu]);

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: [forwardedRef, elementRef],
      props: [
        {
          type: 'button' as const,
          'aria-label': label,
          onClick: handleClick,
          onPointerEnter: handlePointerEnter,
        },
        elementProps,
      ],
    }
  );
});

export namespace MenuBack {
  export type Props = MenuBackProps;
  export type State = MenuState;
}
