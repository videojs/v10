import type { MenuCore, MenuState } from '@videojs/core';
import { isMenuNavigationKey } from '@videojs/core/dom';
import { isInteractiveActivation } from '@videojs/utils/dom';
import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSafeId } from '../../utils/use-safe-id';
import { MenuTriggerChildContextProvider, useMenuContext } from './context';
import { callKeyDownHandler, preventMenuKeyDefault } from './menu-keyboard';

type MenuTriggerElement = HTMLButtonElement | HTMLDivElement;

export interface MenuTriggerProps extends Omit<
  UIComponentProps<'button', MenuState>,
  'type' | 'onClick' | 'onKeyDown'
> {
  /** Disables the trigger. */
  disabled?: boolean;
  onClick?: React.MouseEventHandler<MenuTriggerElement>;
  onKeyDown?: React.KeyboardEventHandler<MenuTriggerElement>;
}

/**
 * Button that toggles the menu visibility. At root level renders a `<button>`. When inside a parent menu (as a submenu
 * trigger), renders as a `<div role="menuitem">` that opens the submenu on click or ArrowRight.
 */
export const MenuTrigger = forwardRef<HTMLButtonElement | HTMLDivElement, MenuTriggerProps>(function MenuTrigger(
  { render, className, style, disabled, onClick, onKeyDown, ...elementProps },
  forwardedRef
) {
  const { core, menu, parent, state, contentId } = useMenuContext();
  const isSubMenuTrigger = parent !== null;
  const controlledId = state.open || state.status === 'ending' ? contentId : undefined;

  const elementRef = useRef<HTMLElement>(null);
  const triggerId = useSafeId('sub-trigger');

  const parentMenuApi = parent?.menu ?? null;

  // Register with the parent menu's item list when acting as a submenu trigger.
  useEffect(() => {
    if (!isSubMenuTrigger || !parentMenuApi) return;

    const element = elementRef.current;
    if (!element) return;

    menu.setTriggerElement(element);
    const unregister = parentMenuApi.registerItem(element);

    return () => {
      unregister();
      menu.setTriggerElement(null);
    };
  }, [isSubMenuTrigger, menu, parentMenuApi]);

  const openSubMenu = useCallback(() => {
    if (!disabled) menu.open('click');
  }, [disabled, menu]);

  const handleSubMenuClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);

      if (event.defaultPrevented) return;

      openSubMenu();
    },
    [onClick, openSubMenu]
  );

  const handleSubMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const defaultPreventedByUser = callKeyDownHandler(onKeyDown, event);
      if (disabled || defaultPreventedByUser) return;

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

    parentMenuApi.highlight(element, { focus: false, pointer: true });
  }, [disabled, parentMenuApi]);

  // Root trigger mode — standard button that toggles the menu.
  const triggerRef = useCallback(
    (element: HTMLButtonElement | null) => {
      menu.setTriggerElement(element);
    },
    [menu]
  );

  const handleRootKeyDown = useCallback(
    (event: React.KeyboardEvent<MenuTriggerElement>) => {
      const defaultPreventedByUser = callKeyDownHandler(onKeyDown, event);

      if (disabled || defaultPreventedByUser) {
        if (disabled && isMenuNavigationKey(event)) event.preventDefault();

        return;
      }

      if (isInteractiveActivation(event.nativeEvent)) {
        event.preventDefault();
        menu.triggerProps.onClick(event.nativeEvent);
        return;
      }

      menu.triggerProps.onKeyDown(event);
    },
    [disabled, menu.triggerProps, onKeyDown]
  );

  const rootTriggerProps = useMemo(
    () => ({
      onClick: disabled ? (event: React.MouseEvent<HTMLElement>) => event.preventDefault() : menu.triggerProps.onClick,
      onKeyDown: handleRootKeyDown,
    }),
    [disabled, handleRootKeyDown, menu.triggerProps]
  );

  // Submenu trigger mode — renders as a div with role="menuitem"
  if (isSubMenuTrigger) {
    return (
      <MenuTriggerSubmenu
        render={render}
        className={className}
        style={style}
        disabled={disabled}
        elementProps={elementProps}
        forwardedRef={forwardedRef}
        elementRef={elementRef}
        triggerId={triggerId}
        triggerAttrs={core.getTriggerAttrs(state, controlledId)}
        state={state}
        onSubMenuClick={handleSubMenuClick}
        onSubMenuKeyDown={handleSubMenuKeyDown}
        onPointerEnter={handlePointerEnter}
      />
    );
  }

  return (
    <MenuTriggerChildContextProvider value>
      {renderElement(
        'button',
        { render, className, style },
        {
          state,
          ref: [forwardedRef as React.Ref<HTMLButtonElement>, triggerRef],
          props: [
            { type: 'button' as const, ...core.getTriggerAttrs(state, controlledId) },
            disabled ? { disabled: true, 'aria-disabled': 'true' as const } : undefined,
            state.open ? { onKeyDownCapture: preventMenuKeyDefault } : undefined,
            rootTriggerProps,
            elementProps,
          ],
        }
      )}
    </MenuTriggerChildContextProvider>
  );
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
  triggerAttrs: ReturnType<MenuCore['getTriggerAttrs']>;
  state: MenuState;
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
  triggerAttrs,
  state,
  onSubMenuClick,
  onSubMenuKeyDown,
  onPointerEnter,
}: MenuTriggerSubmenuProps) {
  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      ref: [forwardedRef, elementRef as React.Ref<HTMLDivElement>],
      props: [
        {
          id: triggerId,
          role: 'menuitem' as const,
          ...triggerAttrs,
          'aria-disabled': disabled ? true : undefined,
          'data-has-submenu': '',
          onClick: onSubMenuClick,
          onKeyDownCapture: preventMenuKeyDefault,
          onKeyDown: onSubMenuKeyDown,
          onPointerEnter,
        },
        elementProps,
      ],
    }
  );
}
