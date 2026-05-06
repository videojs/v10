'use client';

import type { MenuState } from '@videojs/core';
import {
  createMenuViewTransition,
  getAnchorPositionStyle,
  getMenuViewportAttrs,
  getMenuViewportElement,
  getMenuViewTransitionAttrs,
  getPopupPositionRect,
  getRootPositionOptions,
  isMenuNavigationKey,
  resolveOffsets,
  syncMenuViewRoot,
  syncMenuViewTransition,
  type UIKeyboardEvent,
} from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import { supportsAnchorPositioning } from '@videojs/utils/dom';
import type { CSSProperties } from 'react';
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { useMenuContext, useSubMenuContext } from './context';

export interface MenuContentProps extends UIComponentProps<'div', MenuState> {}

const POPOVER_RESET: CSSProperties = { position: 'fixed', inset: 'auto', margin: 0 };

function toUIKeyboardEvent(event: React.KeyboardEvent<HTMLDivElement>): UIKeyboardEvent {
  return {
    get defaultPrevented() {
      return event.defaultPrevented;
    },
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    target: event.target instanceof Node ? event.target : event.currentTarget,
    currentTarget: event.currentTarget,
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation(),
  };
}

/** Container for menu items. Positioned relative to the trigger at root level; renders in-place as a submenu panel when nested. */
export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(function MenuContent(
  { render, className, style, onKeyDown, ...elementProps },
  forwardedRef
) {
  const { core, menu, state, stateAttrMap, anchorName, contentId, activeSubMenuId } = useMenuContext();
  const subMenuCtx = useSubMenuContext();
  const isSubmenu = state.isSubmenu;

  const parentMenu = subMenuCtx?.parentMenu ?? null;
  const subMenuId = subMenuCtx?.subMenuId ?? null;

  const isActive =
    isSubmenu && parentMenu !== null && subMenuId !== null ? parentMenu.activeSubMenuId === subMenuId : false;

  const [menuViewTransition] = useState(() =>
    createMenuViewTransition({
      focusFirstItem() {
        menu.highlightFirstItem({ preventScroll: true });
      },
      restoreFocus(triggerId) {
        if (triggerId) {
          document.getElementById(triggerId)?.focus({ preventScroll: true });
        }
      },
    })
  );
  const menuViewTransitionState = useSnapshot(menuViewTransition.input);
  const menuViewElementRef = useRef<HTMLDivElement | null>(null);
  const parentContentElementRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    return () => menuViewTransition.destroy();
  }, [menuViewTransition]);

  useLayoutEffect(() => {
    if (!isSubmenu) return;

    menuViewTransition.sync({
      active: isActive,
      direction: parentMenu?.navigationDirection ?? 'forward',
      triggerId: parentMenu?.activeSubMenuTriggerId ?? null,
    });
  }, [isActive, isSubmenu, parentMenu, menuViewTransition]);

  const setMenuViewElement = useCallback(
    (element: HTMLDivElement | null) => {
      menuViewElementRef.current = element;
      menu.setContentElement(element);
      menuViewTransition.setElement(element);
    },
    [menu, menuViewTransition]
  );

  const handleSubMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      (onKeyDown as React.KeyboardEventHandler<HTMLDivElement> | undefined)?.(event);

      const keyboardEvent = toUIKeyboardEvent(event);
      menu.contentProps.onKeyDown(keyboardEvent);
      const isBackNavigationKey = event.key === 'ArrowLeft' || event.key === 'Escape';

      const ownsActiveSubmenu =
        parentMenu !== null &&
        subMenuId !== null &&
        parentMenu.menu.navigationInput.current.stack[parentMenu.menu.navigationInput.current.stack.length - 1]
          ?.menuId === subMenuId;

      if (isBackNavigationKey && ownsActiveSubmenu && !event.defaultPrevented) {
        event.preventDefault();
        parentMenu.pop();
      }

      if (isMenuNavigationKey(keyboardEvent) && (!isBackNavigationKey || ownsActiveSubmenu)) {
        event.stopPropagation();
      }
    },
    [onKeyDown, parentMenu, subMenuId, menu]
  );

  const handleRootMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      (onKeyDown as React.KeyboardEventHandler<HTMLDivElement> | undefined)?.(event);
      menu.contentProps.onKeyDown(toUIKeyboardEvent(event));
    },
    [onKeyDown, menu]
  );

  // ─── Root content state (always declared — Rules of Hooks) ───────────────
  const internalRef = useRef<HTMLDivElement>(null);

  const contentRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (isSubmenu) return;
      menu.setContentElement(element);
      if (element && supportsAnchorPositioning()) {
        element.style.setProperty('position-anchor', `--${anchorName}`);
      }
    },
    [isSubmenu, menu, anchorName]
  );

  const rootComposedRef = useComposedRefs(forwardedRef, contentRef, internalRef);
  const menuViewComposedRef = useComposedRefs(forwardedRef, setMenuViewElement);

  const positionOptions = useMemo(() => getRootPositionOptions(state.side, state.align), [state.side, state.align]);

  const anchorStyle = useMemo(() => {
    if (isSubmenu || !positionOptions || !supportsAnchorPositioning()) return null;
    const { positionAnchor: _, ...rest } = getAnchorPositionStyle(anchorName, positionOptions);
    return rest as CSSProperties;
  }, [isSubmenu, anchorName, positionOptions]);

  const [manualStyle, setManualStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (isSubmenu) return;
    if (!state.open) return;

    syncMenuViewRoot(internalRef.current, activeSubMenuId !== null);
  }, [isSubmenu, state.open, activeSubMenuId]);

  useLayoutEffect(() => {
    if (!isSubmenu) return;

    const parentContentElement = parentMenu?.menu.contentElement ?? parentContentElementRef.current;
    parentContentElementRef.current = parentContentElement;
    syncMenuViewTransition(parentContentElement, menuViewElementRef.current, menuViewTransitionState);
  });

  useLayoutEffect(() => {
    if (isSubmenu) return;
    if (supportsAnchorPositioning()) return;
    if (!positionOptions) return;
    if (!state.open) {
      setManualStyle(null);
      return;
    }

    const rootPositionOptions = positionOptions;

    function measure(): void {
      const triggerElement = menu.triggerElement;
      const contentElement = internalRef.current;
      if (!triggerElement || !contentElement) return;

      const triggerRect = triggerElement.getBoundingClientRect();
      const contentRect = getPopupPositionRect(contentElement);
      const boundaryRect = document.documentElement.getBoundingClientRect();
      const offsets = resolveOffsets(contentElement);

      setManualStyle(
        getAnchorPositionStyle(
          anchorName,
          rootPositionOptions,
          triggerRect,
          contentRect,
          boundaryRect,
          offsets
        ) as CSSProperties
      );
    }

    measure();

    const triggerElement = menu.triggerElement;
    const contentElement = internalRef.current;

    let animationFrameId = 0;
    function reposition(): void {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(measure);
    }

    reposition();

    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => reposition()) : null;

    if (triggerElement && resizeObserver) resizeObserver.observe(triggerElement);
    if (contentElement && resizeObserver) resizeObserver.observe(contentElement);

    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isSubmenu, state.open, anchorName, positionOptions, menu]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isSubmenu) {
    if (menuViewTransitionState.phase === 'hidden') return null;

    const subMenuContent = renderElement(
      'div',
      { render, className, style },
      {
        state,
        stateAttrMap,
        ref: menuViewComposedRef,
        props: [
          {
            ...getMenuViewTransitionAttrs(menuViewTransitionState),
            role: 'menu' as const,
            tabIndex: -1,
            'data-submenu': '',
            onKeyDown: handleSubMenuKeyDown,
          },
          elementProps,
        ],
      }
    );

    const parentContentElement = parentMenu?.menu.contentElement ?? parentContentElementRef.current;

    const parentViewportElement = getMenuViewportElement(parentContentElement);

    return parentViewportElement ? createPortal(subMenuContent, parentViewportElement) : subMenuContent;
  }

  if (!state.open) return null;

  const positioningStyle = anchorStyle ?? manualStyle ?? POPOVER_RESET;

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
          ...getMenuViewportAttrs(),
        },
        { onKeyDown: handleRootMenuKeyDown },
        elementProps,
      ],
    }
  );
});

export namespace MenuContent {
  export type Props = MenuContentProps;
  export type State = MenuState;
}
