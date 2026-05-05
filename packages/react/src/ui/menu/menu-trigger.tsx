'use client';

import type { MenuState } from '@videojs/core';
import { supportsAnchorPositioning } from '@videojs/utils/dom';
import { forwardRef, useCallback, useEffect, useRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSafeId } from '../../utils/use-safe-id';
import { useMenuContext, useSubMenuContext } from './context';

export interface MenuTriggerProps extends UIComponentProps<'button', MenuState> {
  /** Disables the trigger. Only meaningful when used as a submenu trigger inside a parent menu. */
  disabled?: boolean;
}

/**
 * Button that toggles the menu visibility. At root level renders a `<button>`.
 * When inside a parent menu (as a submenu trigger), renders as a `<div role="menuitem">`
 * that pushes the submenu on click or ArrowRight.
 */
export const MenuTrigger = forwardRef<HTMLButtonElement | HTMLDivElement, MenuTriggerProps>(function MenuTrigger(
  { render, className, style, disabled, onClick, onKeyDown, ...elementProps },
  forwardedRef
) {
  const { core, menu, state, stateAttrMap, anchorName, contentId } = useMenuContext();
  const subMenuCtx = useSubMenuContext();
  const isSubMenuTrigger = subMenuCtx !== null;

  const elementRef = useRef<HTMLElement>(null);
  const triggerId = useSafeId('sub-trigger');

  const parentMenu = subMenuCtx?.parentMenu ?? null;
  const parentMenuApi = parentMenu?.menu ?? null;
  const parentState = parentMenu?.state ?? state;
  const parentPush = parentMenu?.push ?? null;
  const subMenuId = subMenuCtx?.subMenuId ?? null;
  const isExpanded = isSubMenuTrigger ? parentMenu?.activeSubMenuId === subMenuId : state.open;

  // Register with the parent menu's item list when acting as a submenu trigger.
  useEffect(() => {
    if (!isSubMenuTrigger || !parentMenuApi) return;
    const element = elementRef.current;
    if (!element) return;
    return parentMenuApi.registerItem(element);
  }, [isSubMenuTrigger, parentMenuApi]);

  const openSubMenu = useCallback(() => {
    if (disabled || !parentPush || !subMenuId) return;
    parentPush(subMenuId, triggerId);
  }, [disabled, parentPush, subMenuId, triggerId]);

  const handleSubMenuClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      (onClick as React.MouseEventHandler<HTMLDivElement> | undefined)?.(event);
      openSubMenu();
    },
    [onClick, openSubMenu]
  );

  const handleSubMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      (onKeyDown as React.KeyboardEventHandler<HTMLDivElement> | undefined)?.(event);
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        openSubMenu();
      }
    },
    [onKeyDown, openSubMenu]
  );

  const handlePointerEnter = useCallback(() => {
    const element = elementRef.current;
    if (!element || disabled || !parentMenuApi) return;
    parentMenuApi.highlight(element);
  }, [disabled, parentMenuApi]);

  // Root trigger mode — standard button that toggles the menu.
  const triggerRef = useCallback(
    (element: HTMLButtonElement | null) => {
      menu.setTriggerElement(element);
      if (element && supportsAnchorPositioning()) {
        element.style.setProperty('anchor-name', `--${anchorName}`);
      }
    },
    [menu, anchorName]
  );

  // Submenu trigger mode — renders as a div with role="menuitem"
  if (isSubMenuTrigger) {
    return renderElement(
      'div',
      { render, className, style },
      {
        state: parentState,
        stateAttrMap,
        ref: [forwardedRef as React.Ref<HTMLDivElement>, elementRef as React.Ref<HTMLDivElement>],
        props: [
          {
            id: triggerId,
            role: 'menuitem' as const,
            'aria-haspopup': 'menu' as const,
            'aria-expanded': isExpanded,
            'aria-disabled': disabled ? true : undefined,
            'data-has-submenu': '',
            onClick: handleSubMenuClick,
            onKeyDown: handleSubMenuKeyDown,
            onPointerEnter: handlePointerEnter,
          },
          elementProps,
        ],
      }
    );
  }

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: [forwardedRef as React.Ref<HTMLButtonElement>, triggerRef],
      props: [{ type: 'button' as const, ...core.getTriggerAttrs(state, contentId) }, menu.triggerProps, elementProps],
    }
  );
});

export namespace MenuTrigger {
  export type Props = MenuTriggerProps;
  export type State = MenuState;
}
