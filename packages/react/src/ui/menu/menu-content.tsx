'use client';

import { MenuCSSVars, type MenuState, PopoverCSSVars } from '@videojs/core';
import { getRootPositionOptions, isMenuNavigationKey } from '@videojs/core/dom';
import { forwardRef, useCallback, useMemo, useRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { usePopupPosition } from '../popover/use-popup-position';
import { useMenuContext } from './context';
import { toUIFocusEvent, toUIKeyboardEvent } from './menu-events';

export interface MenuContentProps extends UIComponentProps<'div', MenuState> {}

function preventMenuKeyDefault(event: React.KeyboardEvent<HTMLDivElement>): void {
  const keyboardEvent = toUIKeyboardEvent(event);

  if (
    event.key !== 'Escape' &&
    event.key !== 'ArrowLeft' &&
    event.key !== 'ArrowRight' &&
    isMenuNavigationKey(keyboardEvent) &&
    !event.defaultPrevented
  ) {
    event.preventDefault();
  }
}

/** Positioned container for an independent menu's items. */
export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(function MenuContent(
  { render, className, style, onKeyDown, onBlur, ...elementProps },
  forwardedRef
) {
  const {
    core,
    menu,
    state,
    preferredSide,
    setPositionedSide,
    stateAttrMap,
    anchorName,
    contentId,
    boundary,
    container,
  } = useMenuContext();
  const internalRef = useRef<HTMLDivElement>(null);

  const contentRef = useCallback(
    (element: HTMLDivElement | null) => {
      menu.setContentElement(element);
    },
    [menu]
  );
  const composedRef = useComposedRefs(forwardedRef, contentRef, internalRef);
  const positionOptions = useMemo(
    () => getRootPositionOptions(preferredSide, state.align),
    [preferredSide, state.align]
  );
  const handlePosition = useCallback(
    (side: NonNullable<MenuState['side']>) => {
      setPositionedSide(side);

      const content = internalRef.current;
      if (!content) return;

      const availableWidth = content.style.getPropertyValue(PopoverCSSVars.availableWidth);
      const availableHeight = content.style.getPropertyValue(PopoverCSSVars.availableHeight);
      if (availableWidth) content.style.setProperty(MenuCSSVars.availableWidth, availableWidth);
      if (availableHeight) content.style.setProperty(MenuCSSVars.availableHeight, availableHeight);
    },
    [setPositionedSide]
  );
  const positioningStyle = usePopupPosition({
    open: state.open,
    anchorName,
    position: positionOptions,
    triggerSource: menu,
    popupRef: internalRef,
    boundary,
    container,
    onSideChange: handlePosition,
  });

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      const keyboardEvent = toUIKeyboardEvent(event);
      menu.contentProps.onKeyDown(keyboardEvent);
      if (event.key !== 'Escape' && event.defaultPrevented) event.stopPropagation();
    },
    [menu, onKeyDown]
  );
  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      onBlur?.(event);
      menu.contentProps.onFocusOut(toUIFocusEvent(event));
    },
    [menu, onBlur]
  );

  if (!state.open) return null;

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: composedRef,
      props: [
        {
          id: contentId,
          style: positioningStyle,
          ...core.getContentAttrs(state),
          onKeyDownCapture: preventMenuKeyDefault,
          onKeyDown: handleKeyDown,
          onBlur: handleBlur,
        },
        elementProps,
      ],
    }
  );
});

export namespace MenuContent {
  export type Props = MenuContentProps;
  export type State = MenuState;
}
