'use client';

import type { MenuState } from '@videojs/core';
import { completeMenuItemSelection } from '@videojs/core/dom';
import { forwardRef, useCallback, useEffect, useRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useMenuContext, useOptionalMenuItemSettingContext, useSubMenuContext } from './context';
import { MenuItemSettingProvider } from './menu-item-setting-provider';
import type { MenuItemSettingType } from './menu-item-type';

export interface MenuItemProps extends UIComponentProps<'div', MenuState> {
  /** Called when the item is selected. */
  onSelect?: () => void;
  /** Whether the item is disabled. */
  disabled?: boolean;
  /** Setting kind for submenu triggers (`playback-rate`, `quality`, `audio-track`, or `captions`). */
  type?: MenuItemSettingType | undefined;
}

/** A single action in the menu. Renders a `<div>` with `role="menuitem"`. */
export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  { render, className, style, onSelect, disabled, type, onClick, ...elementProps },
  forwardedRef
) {
  const { menu, state } = useMenuContext();
  const subMenuCtx = useSubMenuContext();
  const parentMenu = subMenuCtx?.parentMenu.menu ?? null;
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
      completeMenuItemSelection(menu, parentMenu);
    },
    [disabled, onClick, onSelect, menu, parentMenu]
  );

  const handlePointerEnter = useCallback(() => {
    const element = elementRef.current;
    if (!element || disabled) return;
    menu.highlight(element, { focus: false });
  }, [menu, disabled]);

  const item = (
    <MenuItemContent
      disabled={disabled}
      elementProps={elementProps}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      render={render}
      className={className}
      style={style}
      state={state}
      forwardedRef={forwardedRef}
      elementRef={elementRef}
    />
  );

  if (!type) return item;

  return <MenuItemSettingProvider type={type}>{item}</MenuItemSettingProvider>;
});

interface MenuItemContentProps {
  disabled: boolean | undefined;
  elementProps: Record<string, unknown>;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerEnter: () => void;
  render: MenuItemProps['render'];
  className: MenuItemProps['className'];
  style: MenuItemProps['style'];
  state: MenuState;
  forwardedRef: React.ForwardedRef<HTMLDivElement>;
  elementRef: React.RefObject<HTMLDivElement | null>;
}

function MenuItemContent({
  disabled,
  elementProps,
  onClick,
  onPointerEnter,
  render,
  className,
  style,
  state,
  forwardedRef,
  elementRef,
}: MenuItemContentProps) {
  const setting = useOptionalMenuItemSettingContext();
  const settingAttrs = setting ? { 'data-availability': setting.availability } : undefined;

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      ref: [forwardedRef, elementRef],
      props: [
        {
          role: 'menuitem' as const,
          'aria-disabled': disabled ? true : undefined,
          onClick,
          onPointerEnter,
          ...settingAttrs,
        },
        elementProps,
      ],
    }
  );
}

export namespace MenuItem {
  export type Props = MenuItemProps;
  export type State = MenuState;
}
