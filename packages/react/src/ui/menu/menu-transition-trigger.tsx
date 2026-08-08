'use client';

import { type MenuState, MenuTransitionDataAttrs } from '@videojs/core';
import { forwardRef, useCallback, useEffect, useRef } from 'react';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext } from './context';
import { useMenuTransitionRootContext, useOptionalMenuTransitionViewContext } from './menu-transition-context';
import { MenuTrigger as BaseMenuTrigger, type MenuTriggerProps as BaseMenuTriggerProps } from './menu-trigger';

export interface MenuTriggerProps extends Omit<UIComponentProps<'button', MenuState>, 'type'> {
  disabled?: boolean;
}

/** Base Menu.Trigger, or a child-view trigger when bound by TransitionView. */
export const MenuTrigger = forwardRef<HTMLButtonElement | HTMLDivElement, MenuTriggerProps>(
  function MenuTrigger(props, forwardedRef) {
    const view = useOptionalMenuTransitionViewContext();
    if (!view) {
      return (
        <BaseMenuTrigger {...(props as BaseMenuTriggerProps)} ref={forwardedRef as React.Ref<HTMLButtonElement>} />
      );
    }
    return <TransitionViewTrigger {...props} ref={forwardedRef as React.Ref<HTMLDivElement>} view={view} />;
  }
);

interface TransitionViewTriggerProps extends MenuTriggerProps {
  view: NonNullable<ReturnType<typeof useOptionalMenuTransitionViewContext>>;
}

const TransitionViewTrigger = forwardRef<HTMLDivElement, TransitionViewTriggerProps>(function TransitionViewTrigger(
  { view, render, className, style, disabled, onClick, onKeyDown, ...elementProps },
  forwardedRef
) {
  const child = useMenuContext();
  const { parentMenu } = useMenuTransitionRootContext();
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    view.setTriggerElement(element);
    child.menu.setTriggerElement(element);
    const unregister = parentMenu.menu.registerItem(element);
    return () => {
      unregister();
      view.setTriggerElement(null);
      child.menu.setTriggerElement(null);
    };
  }, [child.menu, parentMenu.menu, view]);

  const open = useCallback(() => {
    if (!disabled) child.menu.open('click');
  }, [child.menu, disabled]);
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event as never);
      if (!event.defaultPrevented) open();
    },
    [onClick, open]
  );
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event as never);
      if (event.defaultPrevented || disabled) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        open();
      }
    },
    [disabled, onKeyDown, open]
  );
  const handlePointerEnter = useCallback(() => {
    const element = elementRef.current;
    if (element && !disabled) parentMenu.menu.highlight(element, { focus: false });
  }, [disabled, parentMenu.menu]);
  return renderElement(
    'div',
    { render, className, style },
    {
      state: parentMenu.state,
      ref: [forwardedRef, elementRef],
      props: [
        {
          role: 'menuitem' as const,
          [MenuTransitionDataAttrs.hasSubmenu]: '',
          ...child.core.getTriggerAttrs(child.state, child.contentId),
          'aria-disabled': disabled ? true : undefined,
          onClick: handleClick,
          onKeyDown: handleKeyDown,
          onPointerEnter: handlePointerEnter,
        },
        elementProps,
      ],
    }
  );
});

export namespace MenuTrigger {
  export type Props = MenuTriggerProps;
  export type State = MenuState;
}
