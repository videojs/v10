import { type PopoverProps as CorePopoverProps, PopoverCore, PopoverDataAttrs } from '@videojs/core';
import {
  createPopover,
  createTransition,
  type PopoverChangeDetails,
  type PositioningBoundary,
} from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import { isUndefined } from '@videojs/utils/predicate';
import type { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useOptionalContainer } from '../../player/context';
import { useOptionalPopupGroup } from '../../player/popup-group-context';
import { useCommittedRef } from '../../utils/use-committed-ref';
import { useDestroy } from '../../utils/use-destroy';
import { useSafeId } from '../../utils/use-safe-id';
import { useOptionalControlsContext } from '../controls/context';
import { usePositionedState } from '../hooks/use-positioned-state';
import { PopoverContextProvider } from './context';

export interface PopoverRootProps extends CorePopoverProps {
  /** Boundary used to constrain the popup size. */
  boundary?: PositioningBoundary;
  /** Called when the popover open state changes (fires immediately, before animations). */
  onOpenChange?: (open: boolean, details: PopoverChangeDetails) => void;
  /** Called after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  children?: ReactNode;
}

export function PopoverRoot({
  open: controlledOpen,
  defaultOpen = PopoverCore.defaultProps.defaultOpen,
  onOpenChange: onOpenChangeProp,
  onOpenChangeComplete: onOpenChangeCompleteProp,
  openOnHover = PopoverCore.defaultProps.openOnHover,
  delay = PopoverCore.defaultProps.delay,
  closeDelay = PopoverCore.defaultProps.closeDelay,
  boundary = 'container',
  children,
  ...coreProps
}: PopoverRootProps): ReactNode {
  const container = useOptionalContainer();
  const popupGroup = useOptionalPopupGroup();
  const controls = useOptionalControlsContext();

  const isControlled = !isUndefined(controlledOpen);
  const initialOpenRef = useRef(!isControlled && defaultOpen);

  // Publish committed values before layout work so the retained popover never
  // reads abandoned or stale props.
  const onOpenChangeRef = useCommittedRef(onOpenChangeProp);
  const onOpenChangeCompleteRef = useCommittedRef(onOpenChangeCompleteProp);
  const closeOnEscapeRef = useCommittedRef(coreProps.closeOnEscape);
  const closeOnOutsideClickRef = useCommittedRef(coreProps.closeOnOutsideClick);
  const openOnHoverRef = useCommittedRef(openOnHover);
  const delayRef = useCommittedRef(delay);
  const closeDelayRef = useCommittedRef(closeDelay);
  const popupGroupRef = useCommittedRef(popupGroup);

  const [popover] = useState(() => {
    const instance = createPopover({
      transition: createTransition(),
      onOpenChange: (nextOpen: boolean, details: PopoverChangeDetails) => {
        onOpenChangeRef.current?.(nextOpen, details);
      },
      onOpenChangeComplete: (nextOpen: boolean) => {
        onOpenChangeCompleteRef.current?.(nextOpen);
      },
      closeOnEscape: () => closeOnEscapeRef.current ?? PopoverCore.defaultProps.closeOnEscape,
      closeOnOutsideClick: () => closeOnOutsideClickRef.current ?? PopoverCore.defaultProps.closeOnOutsideClick,
      openOnHover: () => openOnHoverRef.current,
      delay: () => delayRef.current,
      closeDelay: () => closeDelayRef.current,
      group: () => popupGroupRef.current,
    });

    return instance;
  });

  const anchorName = useSafeId();
  const popupId = useSafeId('popup');

  // Commit the initial uncontrolled default or the current controlled value.
  useLayoutEffect(() => {
    let nextOpen = controlledOpen;
    if (isUndefined(nextOpen)) {
      if (!initialOpenRef.current) return;
      initialOpenRef.current = false;
      nextOpen = true;
    }

    const { active: inputOpen } = popover.input.current;
    if (nextOpen === inputOpen) return;

    if (nextOpen) {
      popover.open('click');
    } else {
      popover.close('click');
    }
  }, [controlledOpen, popover]);

  useEffect(() => {
    if (isUndefined(controls?.state.visible)) return;
    if (controls.state.visible) return;

    popover.close('imperative-action');
  }, [controls?.state.visible, popover]);

  useDestroy(popover);

  const input = useSnapshot(popover.input);
  const core = new PopoverCore(coreProps);
  core.setInput(input);
  const { state, preferredSide, setPositionedSide } = usePositionedState(core.getState());

  return (
    <PopoverContextProvider
      value={{
        core,
        popover,
        state,
        preferredSide,
        setPositionedSide,
        stateAttrMap: PopoverDataAttrs,
        anchorName,
        popupId,
        boundary,
        container,
      }}
    >
      {children}
    </PopoverContextProvider>
  );
}

export namespace PopoverRoot {
  export type Props = PopoverRootProps;
}
