'use client';

import type { MenuState } from '@videojs/core';
import { forwardRef, useCallback, useEffect, useRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext } from './context';

export interface MenuItemProps extends UIComponentProps<'div', MenuState> {
  /** Called when the item is selected. */
  onSelect?: () => void;
  /** Whether the item is disabled. */
  disabled?: boolean;
}

/** A single action in the menu. Renders a `<div>` with `role="menuitem"`. */
export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  { render, className, style, onSelect, disabled, onClick, ...elementProps },
  forwardedRef
) {
  const { menu, state, stateAttrMap } = useMenuContext();
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    return menu.registerItem(element);
  }, [menu]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      onClick?.(event);
      onSelect?.();
      menu.close();
    },
    [disabled, onClick, onSelect, menu]
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
          role: 'menuitem' as const,
          'aria-disabled': disabled ? true : undefined,
          onClick: handleClick,
          onPointerEnter: handlePointerEnter,
        },
        elementProps,
      ],
    }
  );
});

export namespace MenuItem {
  export type Props = MenuItemProps;
  export type State = MenuState;
}
