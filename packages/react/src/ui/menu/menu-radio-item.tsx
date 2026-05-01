'use client';

import type { MenuState } from '@videojs/core';
import { forwardRef, useCallback, useEffect, useRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext, useMenuRadioGroupContext, useSubMenuContext } from './context';

export interface MenuRadioItemProps extends UIComponentProps<'div', MenuState> {
  /** The value this item represents. */
  value: string;
  /** Whether the item is disabled. */
  disabled?: boolean;
}

/** A radio-style menu item. Renders a `<div>` with `role="menuitemradio"`. */
export const MenuRadioItem = forwardRef<HTMLDivElement, MenuRadioItemProps>(function MenuRadioItem(
  { render, className, style, value, disabled, onClick, ...elementProps },
  forwardedRef
) {
  const { menu, state, stateAttrMap } = useMenuContext();
  const { value: groupValue, onValueChange } = useMenuRadioGroupContext();
  const subMenuCtx = useSubMenuContext();
  const elementRef = useRef<HTMLDivElement>(null);
  const checked = groupValue === value;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    return menu.registerItem(element);
  }, [menu]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      onClick?.(event);
      onValueChange(value);
      // In a submenu, auto-navigate back to the parent view after selection.
      if (subMenuCtx) {
        subMenuCtx.parentMenu.pop();
      } else {
        menu.close();
      }
    },
    [disabled, onClick, onValueChange, value, menu, subMenuCtx]
  );

  const handlePointerEnter = useCallback(() => {
    const element = elementRef.current;
    if (!element || disabled) return;
    menu.highlight(element);
  }, [menu, disabled]);

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: [forwardedRef, elementRef],
      props: [
        {
          role: 'menuitemradio' as const,
          'aria-checked': checked,
          'aria-disabled': disabled ? true : undefined,
          onClick: handleClick,
          onPointerEnter: handlePointerEnter,
        },
        elementProps,
      ],
    }
  );
});

export namespace MenuRadioItem {
  export type Props = MenuRadioItemProps;
  export type State = MenuState;
}
