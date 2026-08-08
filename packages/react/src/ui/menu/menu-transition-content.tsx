'use client';

import {
  getMenuTransitionPanelAttrs,
  MenuDataAttrs,
  type MenuState,
  MenuTransitionDataAttrs,
  MenuTransitionStateDataAttrs,
} from '@videojs/core';
import { getStateDataAttrs, isMenuNavigationKey } from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext } from './context';
import { MenuContent as BaseMenuContent, type MenuContentProps as BaseMenuContentProps } from './menu-content';
import { toUIFocusEvent, toUIKeyboardEvent } from './menu-events';
import { useMenuTransitionRootContext, useOptionalMenuTransitionViewContext } from './menu-transition-context';
import { measureMenuTransitionPanel } from './menu-transition-measure';

export interface MenuContentProps extends UIComponentProps<'div', MenuState> {}

/** Base Menu.Content, or an inline destination panel when bound by TransitionView. */
export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(function MenuContent(props, forwardedRef) {
  const view = useOptionalMenuTransitionViewContext();
  if (!view) return <BaseMenuContent {...(props as BaseMenuContentProps)} ref={forwardedRef} />;
  return <TransitionViewContent {...props} ref={forwardedRef} view={view} />;
});

interface TransitionViewContentProps extends MenuContentProps {
  view: NonNullable<ReturnType<typeof useOptionalMenuTransitionViewContext>>;
}

const TransitionViewContent = forwardRef<HTMLDivElement, TransitionViewContentProps>(function TransitionViewContent(
  { view, render, className, style, onKeyDown, onBlur, ...elementProps },
  forwardedRef
) {
  const child = useMenuContext();
  const { container, controller } = useMenuTransitionRootContext();
  const transitionState = useSnapshot(view.state);
  const panelRef = useRef<HTMLDivElement>(null);
  const setPanel = useCallback(
    (element: HTMLDivElement | null) => {
      panelRef.current = element;
      view.setPanelElement(element);
      child.menu.setContentElement(element);
    },
    [child.menu, view]
  );
  const measure = useCallback(() => {
    const panel = panelRef.current;
    if (container && panel) controller.setSize(measureMenuTransitionPanel(container, panel));
  }, [container, controller]);

  useLayoutEffect(() => {
    if (transitionState.interactive) measure();
  }, [measure, transitionState.interactive]);

  useEffect(() => {
    if (!transitionState.interactive) return;
    measure();
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure, transitionState.interactive]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!transitionState.interactive || !panel || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [measure, transitionState.interactive]);
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      const keyboardEvent = toUIKeyboardEvent(event);
      child.menu.contentProps.onKeyDown(keyboardEvent);
      if (event.key === 'ArrowLeft' || event.key === 'Escape') {
        event.preventDefault();
        child.menu.close(event.key === 'Escape' ? 'escape' : 'click');
      }
      if (isMenuNavigationKey(keyboardEvent)) event.stopPropagation();
    },
    [child.menu, onKeyDown]
  );
  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      onBlur?.(event);
      child.menu.contentProps.onFocusOut(toUIFocusEvent(event));
    },
    [child.menu, onBlur]
  );

  if (!container) return null;

  return createPortal(
    renderElement(
      'div',
      { render, className, style },
      {
        state: child.state,
        stateAttrMap: MenuDataAttrs,
        ref: [forwardedRef, setPanel],
        props: [
          {
            ...child.core.getContentAttrs(child.state),
            ...getStateDataAttrs(transitionState, MenuTransitionStateDataAttrs),
            ...getMenuTransitionPanelAttrs(transitionState),
            [MenuTransitionDataAttrs.view]: '',
            onKeyDown: handleKeyDown,
            onBlur: handleBlur,
          },
          elementProps,
        ],
      }
    ),
    container
  );
});

export namespace MenuContent {
  export type Props = MenuContentProps;
  export type State = MenuState;
}
