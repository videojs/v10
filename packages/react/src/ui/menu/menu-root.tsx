'use client';

import { MenuCore, MenuDataAttrs } from '@videojs/core';
import { createMenu, createTransition, type MenuChangeDetails } from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useDestroy } from '../../utils/use-destroy';
import { useLatestRef } from '../../utils/use-latest-ref';
import { useSafeId } from '../../utils/use-safe-id';
import { MenuContextProvider, SubMenuContextProvider, useOptionalMenuContext } from './context';

export interface MenuRootProps extends MenuCore.Props {
  /** Called when the menu open state changes (fires immediately, before animations). */
  onOpenChange?: (open: boolean, details: MenuChangeDetails) => void;
  /** Called after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  children?: ReactNode;
}

export function MenuRoot({
  open: controlledOpen,
  defaultOpen = MenuCore.defaultProps.defaultOpen,
  onOpenChange: onOpenChangeProp,
  onOpenChangeComplete: onOpenChangeCompleteProp,
  children,
  ...coreProps
}: MenuRootProps): ReactNode {
  // Detect if we are nested inside a parent Menu.Content — if so, operate as
  // a submenu: no popover positioning, Trigger acts as a parent item.
  const parentMenu = useOptionalMenuContext();
  const isSubmenu = parentMenu !== null;
  const { side, align, closeOnEscape, closeOnOutsideClick } = coreProps;

  const [core] = useState(() => new MenuCore({ ...coreProps, isSubmenu }));

  const isControlled = controlledOpen !== undefined;

  const onOpenChangeRef = useLatestRef(onOpenChangeProp);
  const onOpenChangeCompleteRef = useLatestRef(onOpenChangeCompleteProp);
  const closeOnEscapeRef = useLatestRef(closeOnEscape);
  const closeOnOutsideClickRef = useLatestRef(closeOnOutsideClick);

  const [menu] = useState(() => {
    const instance = createMenu({
      transition: createTransition(),
      onOpenChange(nextOpen, details) {
        onOpenChangeRef.current?.(nextOpen, details);
      },
      onOpenChangeComplete(nextOpen) {
        onOpenChangeCompleteRef.current?.(nextOpen);
      },
      closeOnEscape: () => closeOnEscapeRef.current ?? MenuCore.defaultProps.closeOnEscape,
      closeOnOutsideClick: () => closeOnOutsideClickRef.current ?? MenuCore.defaultProps.closeOnOutsideClick,
    });

    if (!isControlled && defaultOpen) {
      instance.open();
    }

    return instance;
  });

  const anchorName = useSafeId();
  const contentId = useSafeId('menu');

  // Sync controlled open prop → internal state.
  useEffect(() => {
    if (controlledOpen === undefined) return;

    const { active: inputOpen } = menu.input.current;
    if (controlledOpen === inputOpen) return;

    if (controlledOpen) {
      menu.open('click');
    } else {
      menu.close('click');
    }
  }, [controlledOpen, menu]);

  useDestroy(menu);

  const input = useSnapshot(menu.input);
  const state = useMemo(() => {
    core.setProps({ side, align, closeOnEscape, closeOnOutsideClick, isSubmenu });
    core.setInput(input);
    return core.getState();
  }, [core, input, side, align, closeOnEscape, closeOnOutsideClick, isSubmenu]);

  // Subscribe to navigation state — used by Content/Trigger when this is a root menu.
  const navigationInput = useSnapshot(menu.navigationInput);
  const topEntry = navigationInput.stack[navigationInput.stack.length - 1];
  const activeSubMenuId = topEntry?.menuId ?? null;
  const activeSubMenuTriggerId = topEntry?.triggerId ?? null;
  const navigationDirection = navigationInput.direction;

  const contextValue = useMemo(
    () => ({
      core,
      menu,
      state,
      stateAttrMap: MenuDataAttrs,
      contentId,
      anchorName,
      activeSubMenuId,
      activeSubMenuTriggerId,
      navigationDirection,
      push: menu.push,
      pop: menu.pop,
    }),
    [core, menu, state, contentId, anchorName, activeSubMenuId, activeSubMenuTriggerId, navigationDirection]
  );

  const subMenuContextValue = useMemo(
    () => (parentMenu ? { subMenuId: contentId, parentMenu } : null),
    [contentId, parentMenu]
  );

  // When acting as a submenu, expose its content ID and the parent menu context
  // through SubMenuContext so Trigger can register/push and Content can show/hide.
  if (subMenuContextValue) {
    return (
      <MenuContextProvider value={contextValue}>
        <SubMenuContextProvider value={subMenuContextValue}>{children}</SubMenuContextProvider>
      </MenuContextProvider>
    );
  }

  return <MenuContextProvider value={contextValue}>{children}</MenuContextProvider>;
}

export namespace MenuRoot {
  export type Props = MenuRootProps;
}
