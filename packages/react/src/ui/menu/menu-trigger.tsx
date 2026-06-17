'use client';

import type { MenuState } from '@videojs/core';
import { isMenuNavigationKey, type UIKeyboardEvent } from '@videojs/core/dom';
import { supportsAnchorPositioning } from '@videojs/utils/dom';
import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSafeId } from '../../utils/use-safe-id';
import {
  MenuTriggerChildContextProvider,
  useMenuContext,
  useOptionalMenuItemSettingContext,
  useSubMenuContext,
} from './context';
import { MenuItemSettingProvider } from './menu-item-setting-provider';
import type { MenuItemSettingType } from './menu-item-type';

export interface MenuTriggerProps extends Omit<UIComponentProps<'button', MenuState>, 'type'> {
  /** Disables the trigger. */
  disabled?: boolean;
  /** Setting kind for submenu triggers (`playback-rate` or `captions`). */
  type?: MenuItemSettingType | undefined;
}

function toUIKeyboardEvent(event: React.KeyboardEvent<HTMLElement>): UIKeyboardEvent {
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

function preventMenuKeyDefault(event: React.KeyboardEvent<HTMLElement>): void {
  const keyboardEvent = toUIKeyboardEvent(event);

  if (event.key !== 'Escape' && isMenuNavigationKey(keyboardEvent) && !event.defaultPrevented) {
    event.preventDefault();
  }
}

/**
 * Button that toggles the menu visibility. At root level renders a `<button>`.
 * When inside a parent menu (as a submenu trigger), renders as a `<div role="menuitem">`
 * that pushes the submenu on click or ArrowRight.
 */
export const MenuTrigger = forwardRef<HTMLButtonElement | HTMLDivElement, MenuTriggerProps>(function MenuTrigger(
  { render, className, style, disabled, type, onClick, onKeyDown, ...elementProps },
  forwardedRef
) {
  const { core, menu, state, anchorName, contentId } = useMenuContext();
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
      if (disabled) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        openSubMenu();
      }
    },
    [disabled, onKeyDown, openSubMenu]
  );

  const handlePointerEnter = useCallback(() => {
    const element = elementRef.current;
    if (!element || disabled || !parentMenuApi) return;
    parentMenuApi.highlight(element, { focus: false });
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

  const rootTriggerProps = useMemo(() => {
    if (!disabled) return menu.triggerProps;

    return {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        const keyboardEvent = toUIKeyboardEvent(event);
        if (event.key === 'Enter' || event.key === ' ' || isMenuNavigationKey(keyboardEvent)) {
          event.preventDefault();
        }
      },
    };
  }, [disabled, menu.triggerProps]);

  // Submenu trigger mode — renders as a div with role="menuitem"
  if (isSubMenuTrigger) {
    const trigger = (
      <MenuTriggerSubmenu
        render={render}
        className={className}
        style={style}
        disabled={disabled}
        elementProps={elementProps}
        forwardedRef={forwardedRef}
        elementRef={elementRef}
        triggerId={triggerId}
        parentState={parentState}
        isExpanded={isExpanded}
        onSubMenuClick={handleSubMenuClick}
        onSubMenuKeyDown={handleSubMenuKeyDown}
        onPointerEnter={handlePointerEnter}
      />
    );

    if (!type) return trigger;

    return <MenuItemSettingProvider type={type}>{trigger}</MenuItemSettingProvider>;
  }

  const rootTrigger = (
    <MenuTriggerChildContextProvider value>
      {renderElement(
        'button',
        { render, className, style },
        {
          state,
          ref: [forwardedRef as React.Ref<HTMLButtonElement>, triggerRef],
          props: [
            { type: 'button' as const, ...core.getTriggerAttrs(state, contentId) },
            disabled ? { disabled: true, 'aria-disabled': 'true' as const } : undefined,
            state.open ? { onKeyDownCapture: preventMenuKeyDefault } : undefined,
            rootTriggerProps,
            elementProps,
          ],
        }
      )}
    </MenuTriggerChildContextProvider>
  );

  if (!type) return rootTrigger;

  return <MenuItemSettingProvider type={type}>{rootTrigger}</MenuItemSettingProvider>;
});

export namespace MenuTrigger {
  export type Props = MenuTriggerProps;
  export type State = MenuState;
}

interface MenuTriggerSubmenuProps {
  render: MenuTriggerProps['render'];
  className: MenuTriggerProps['className'];
  style: MenuTriggerProps['style'];
  disabled: boolean | undefined;
  elementProps: Record<string, unknown>;
  forwardedRef: React.ForwardedRef<HTMLButtonElement | HTMLDivElement>;
  elementRef: React.RefObject<HTMLElement | null>;
  triggerId: string;
  parentState: MenuState;
  isExpanded: boolean;
  onSubMenuClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSubMenuKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onPointerEnter: () => void;
}

function MenuTriggerSubmenu({
  render,
  className,
  style,
  disabled,
  elementProps,
  forwardedRef,
  elementRef,
  triggerId,
  parentState,
  isExpanded,
  onSubMenuClick,
  onSubMenuKeyDown,
  onPointerEnter,
}: MenuTriggerSubmenuProps) {
  const setting = useOptionalMenuItemSettingContext();
  const settingAttrs = setting ? { 'data-availability': setting.availability } : undefined;

  return renderElement(
    'div',
    { render, className, style },
    {
      state: parentState,
      ref: [forwardedRef, elementRef as React.Ref<HTMLDivElement>],
      props: [
        {
          id: triggerId,
          role: 'menuitem' as const,
          'aria-haspopup': 'menu' as const,
          'aria-expanded': isExpanded,
          'aria-disabled': disabled ? true : undefined,
          'data-has-submenu': '',
          onClick: onSubMenuClick,
          onKeyDownCapture: preventMenuKeyDefault,
          onKeyDown: onSubMenuKeyDown,
          onPointerEnter,
          ...settingAttrs,
        },
        elementProps,
      ],
    }
  );
}
