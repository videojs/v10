import { MenuCore, MenuDataAttrs } from '@videojs/core';
import {
  createMenu,
  createTransition,
  type MenuChangeDetails,
  type PositioningBoundary,
  selectControls,
} from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import type { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useOptionalContainer, useOptionalPlayer } from '../../player/context';
import { useOptionalPopupGroup } from '../../player/popup-group-context';
import { useCommittedRef } from '../../utils/use-committed-ref';
import { useDestroy } from '../../utils/use-destroy';
import { useSafeId } from '../../utils/use-safe-id';
import { useOptionalControlsContext } from '../controls/context';
import { usePositionedState } from '../hooks/use-positioned-state';
import { MenuContextProvider, useOptionalMenuContext } from './context';

export interface MenuRootProps extends MenuCore.Props {
  /** Boundary used to constrain the root menu popup size. */
  boundary?: PositioningBoundary;
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
  boundary = 'container',
  children,
  ...coreProps
}: MenuRootProps): ReactNode {
  // Detect if we are nested inside a parent Menu.Content — if so, operate as
  // a submenu: no popover positioning, Trigger acts as a parent item.
  const parentMenu = useOptionalMenuContext();
  const controls = useOptionalControlsContext();
  const controlsState = useOptionalPlayer(selectControls);
  const container = useOptionalContainer();
  const popupGroup = useOptionalPopupGroup();
  const isSubmenu = parentMenu !== null;
  const { side, align, closeOnEscape, closeOnOutsideClick } = coreProps;

  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const resolvedOpen = controlledOpen ?? uncontrolledOpen;

  const onOpenChangeRef = useCommittedRef(onOpenChangeProp);
  const onOpenChangeCompleteRef = useCommittedRef(onOpenChangeCompleteProp);
  const closeOnEscapeRef = useCommittedRef(closeOnEscape);
  const closeOnOutsideClickRef = useCommittedRef(closeOnOutsideClick);
  const popupGroupRef = useCommittedRef(popupGroup);
  const isSubmenuRef = useCommittedRef(isSubmenu);

  const [menu] = useState(() => {
    const instance = createMenu({
      transition: createTransition(),
      onOpenChange(nextOpen, details) {
        if (!isControlled) setUncontrolledOpen(nextOpen);
        onOpenChangeRef.current?.(nextOpen, details);
      },
      onOpenChangeComplete(nextOpen) {
        onOpenChangeCompleteRef.current?.(nextOpen);
      },
      closeOnEscape: () => closeOnEscapeRef.current ?? MenuCore.defaultProps.closeOnEscape,
      closeOnOutsideClick: () => closeOnOutsideClickRef.current ?? MenuCore.defaultProps.closeOnOutsideClick,
      group: () => (isSubmenuRef.current ? undefined : popupGroupRef.current),
    });

    return instance;
  });

  const anchorName = useSafeId();
  const contentId = useSafeId('menu');

  useLayoutEffect(() => parentMenu?.menu.registerSubmenu(menu), [menu, parentMenu?.menu]);

  // Commit only the open state resolved by controlled/uncontrolled ownership.
  useLayoutEffect(() => {
    menu.syncOpen(resolvedOpen);
  }, [menu, resolvedOpen]);

  useEffect(() => {
    if (isSubmenu || controls?.state.visible !== false) return;

    menu.close('imperative-action');
  }, [controls?.state.visible, isSubmenu, menu]);

  useDestroy(menu);

  const input = useSnapshot(menu.input);

  useEffect(() => {
    if (!input.active || isSubmenu) return;

    return controlsState?.requestControlsLock();
  }, [controlsState?.requestControlsLock, input.active, isSubmenu]);

  const projection = useMemo(() => {
    const core = new MenuCore({ side, align, closeOnEscape, closeOnOutsideClick });
    core.setInput({ ...input, isSubmenu });
    return { core, state: core.getState() };
  }, [input, side, align, closeOnEscape, closeOnOutsideClick, isSubmenu]);
  const { core, state: preferredState } = projection;
  const { state, preferredSide, setPositionedSide } = usePositionedState(preferredState);

  const contextValue = useMemo(
    () => ({
      core,
      menu,
      parent: parentMenu,
      state,
      preferredSide,
      setPositionedSide,
      stateAttrMap: MenuDataAttrs,
      contentId,
      anchorName,
      boundary,
      container,
    }),
    [core, menu, parentMenu, state, preferredSide, setPositionedSide, contentId, anchorName, boundary, container]
  );

  return <MenuContextProvider value={contextValue}>{children}</MenuContextProvider>;
}

export namespace MenuRoot {
  export type Props = MenuRootProps;
}
