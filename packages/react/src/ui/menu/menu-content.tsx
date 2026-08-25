import type { MenuState } from '@videojs/core';
import {
  getRootPositionOptions,
  isMenuNavigationKey,
  MenuPositioningCSSVars,
  observeMenuSize,
  syncMenuSizeChain,
} from '@videojs/core/dom';
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { usePopupPosition } from '../popover/use-popup-position';
import { useMenuContext } from './context';
import { callKeyDownHandler, preventMenuKeyDefault } from './menu-keyboard';

export interface MenuContentProps extends UIComponentProps<'div', MenuState> {}

/** Container for menu items. Positioned relative to the trigger at root level; renders in-place as a submenu panel when nested. */
export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(function MenuContent(
  { render, className, style, onKeyDown, onBlur, ...elementProps },
  forwardedRef
) {
  const {
    core,
    menu,
    parent,
    state,
    preferredSide,
    setPositionedSide,
    stateAttrMap,
    anchorName,
    contentId,
    boundary,
    container,
  } = useMenuContext();
  const isSubmenu = state.isSubmenu;
  const isActive = isSubmenu && state.open;
  const wasActiveRef = useRef(false);

  useLayoutEffect(() => {
    if (!isSubmenu) return undefined;

    const wasActive = wasActiveRef.current;
    wasActiveRef.current = isActive;

    if (isActive && !wasActive) {
      const frame = requestAnimationFrame(() => menu.highlightFirstItem({ preventScroll: true }));
      return () => cancelAnimationFrame(frame);
    }

    return undefined;
  }, [isActive, isSubmenu, menu]);

  const setSubmenuContentElement = useCallback(
    (element: HTMLDivElement | null) => {
      menu.setContentElement(element);
      if (!element) {
        requestAnimationFrame(() => {
          syncMenuSizeChain(parent?.menu.contentElement ?? null);
          if (!menu.input.current.active) menu.restoreFocus({ preventScroll: true });
        });
      }
    },
    [menu, parent]
  );

  const handleSubMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const defaultPreventedByUser = callKeyDownHandler(
        /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ onKeyDown as
          | React.KeyboardEventHandler<HTMLDivElement>
          | undefined,
        event
      );
      const isNavigationKey = isMenuNavigationKey(event);
      menu.contentProps.onKeyDown(event);
      const isBackNavigationKey = event.key === 'ArrowLeft' || event.key === 'Escape';

      if (isBackNavigationKey && !defaultPreventedByUser) {
        event.preventDefault();
        menu.close('escape');
      }

      if (isNavigationKey) event.stopPropagation();
    },
    [onKeyDown, menu]
  );

  const handleRootMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
        onKeyDown as React.KeyboardEventHandler<HTMLDivElement> | undefined
      )?.(event);
      menu.contentProps.onKeyDown(event);
      if (event.key === 'Escape') return;
      if (isMenuNavigationKey(event)) event.stopPropagation();
    },
    [onKeyDown, menu]
  );

  const handleRootMenuBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
        onBlur as React.FocusEventHandler<HTMLDivElement> | undefined
      )?.(event);
      menu.contentProps.onFocusOut(event);
    },
    [onBlur, menu]
  );

  const handleSubMenuBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
        onBlur as React.FocusEventHandler<HTMLDivElement> | undefined
      )?.(event);
      menu.contentProps.onFocusOut(event);
    },
    [onBlur, menu]
  );

  const internalRef = useRef<HTMLDivElement>(null);
  const contentRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!isSubmenu) menu.setContentElement(element);
    },
    [isSubmenu, menu]
  );
  const rootComposedRef = useComposedRefs(forwardedRef, contentRef, internalRef);
  const submenuComposedRef = useComposedRefs(forwardedRef, setSubmenuContentElement);
  const positionOptions = useMemo(
    () => getRootPositionOptions(preferredSide, state.align),
    [preferredSide, state.align]
  );
  const positioningStyle = usePopupPosition({
    open: state.open && !isSubmenu,
    anchorName,
    position: positionOptions,
    triggerSource: menu,
    popupRef: internalRef,
    boundary,
    container,
    cssVars: MenuPositioningCSSVars,
    onSideChange: setPositionedSide,
  });

  useLayoutEffect(() => {
    if (isSubmenu || !state.open) return;

    const contentElement = internalRef.current;
    if (!contentElement) return;

    const sync = () => syncMenuSizeChain(contentElement);
    sync();
    const frame = requestAnimationFrame(sync);
    const stopObserving = observeMenuSize(contentElement, sync);

    return () => {
      cancelAnimationFrame(frame);
      stopObserving();
    };
  }, [isSubmenu, state.open]);

  useLayoutEffect(() => {
    if (!isSubmenu) return;

    const isEnding = state.status === 'ending';
    const parentContentElement = parent?.menu.contentElement ?? null;
    const sync = () => syncMenuSizeChain(parentContentElement);
    sync();
    const frame = requestAnimationFrame(sync);
    const stopObserving =
      state.open && !isEnding && parentContentElement ? observeMenuSize(parentContentElement, sync) : null;

    return () => {
      cancelAnimationFrame(frame);
      stopObserving?.();
    };
  }, [isSubmenu, parent, state.open, state.status]);

  if (isSubmenu) {
    if (!isActive && state.status !== 'ending') return null;

    const subMenuContent = renderElement(
      'div',
      { render, className, style },
      {
        state,
        stateAttrMap,
        ref: submenuComposedRef,
        props: [
          {
            id: contentId,
            role: 'menu' as const,
            tabIndex: -1,
            onKeyDownCapture: preventMenuKeyDefault,
            onKeyDown: handleSubMenuKeyDown,
            onBlur: handleSubMenuBlur,
          },
          elementProps,
        ],
      }
    );

    const parentContentElement = parent?.menu.contentElement ?? null;
    return parentContentElement ? createPortal(subMenuContent, parentContentElement) : subMenuContent;
  }

  if (!state.open && state.status !== 'ending') return null;

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: rootComposedRef,
      props: [
        {
          id: contentId,
          style: positioningStyle,
          ...core.getContentAttrs(state),
        },
        { onKeyDownCapture: preventMenuKeyDefault, onKeyDown: handleRootMenuKeyDown, onBlur: handleRootMenuBlur },
        elementProps,
      ],
    }
  );
});

export namespace MenuContent {
  export type Props = MenuContentProps;
  export type State = MenuState;
}
