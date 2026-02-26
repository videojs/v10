'use client';

import { type PopoverRootProps as CorePopoverRootProps, PopoverCore } from '@videojs/core';
import { createPopover, type PopoverChangeDetails } from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { PopoverContextProvider } from './popover-context';

export interface PopoverRootProps extends CorePopoverRootProps {
  /** Called when the popover open state changes. */
  onOpenChange?: (open: boolean, details: PopoverChangeDetails) => void;
  children?: ReactNode;
}

export function PopoverRoot({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange: onOpenChangeProp,
  openOnHover = false,
  delay = 300,
  closeDelay = 0,
  children,
  ...coreProps
}: PopoverRootProps): ReactNode {
  const [core] = useState(() => new PopoverCore());
  core.setProps(coreProps);

  const isControlled = controlledOpen !== undefined;

  // Use refs to avoid stale closures in the createPopover callback.
  // createPopover captures onOpenChange once at creation time, so we
  // need the ref indirection to always call the latest handler.
  const onOpenChangeRef = useRef(onOpenChangeProp);
  onOpenChangeRef.current = onOpenChangeProp;

  const isControlledRef = useRef(isControlled);
  isControlledRef.current = isControlled;

  const [popover] = useState(() => {
    const instance = createPopover({
      onOpenChange: (nextOpen: boolean, details: PopoverChangeDetails) => {
        // In controlled mode, the parent decides whether to accept the state
        // change by updating the `open` prop. The internal state has already
        // been patched by createPopover — the useEffect below will revert it
        // if the controlled prop disagrees.
        onOpenChangeRef.current?.(nextOpen, details);
      },
      closeOnEscape: () => coreProps.closeOnEscape ?? PopoverCore.defaultProps.closeOnEscape,
      closeOnOutsideClick: () => coreProps.closeOnOutsideClick ?? PopoverCore.defaultProps.closeOnOutsideClick,
      openOnHover: () => openOnHover,
      delay: () => delay,
      closeDelay: () => closeDelay,
    });

    // Apply defaultOpen on creation (uncontrolled only)
    if (!isControlledRef.current && defaultOpen) {
      instance.open('click');
    }

    return instance;
  });

  // Sync controlled open prop → internal interaction state.
  // In controlled mode, the `open` prop is the source of truth.
  // If the internal state diverges (e.g., user interaction changed it but
  // the parent hasn't updated the prop), we force-sync here.
  useEffect(() => {
    if (!isControlledRef.current) return;

    const { open: interactionOpen } = popover.interaction.current;
    if (controlledOpen === interactionOpen) return;

    if (controlledOpen) {
      popover.open('click');
    } else {
      popover.close('click');
    }
  }, [controlledOpen, popover]);

  // Cleanup on unmount
  useEffect(() => () => popover.destroy(), [popover]);

  const interaction = useSnapshot(popover.interaction);
  const state = core.getState(interaction);

  return <PopoverContextProvider value={{ core, popover, state }}>{children}</PopoverContextProvider>;
}

export namespace PopoverRoot {
  export type Props = PopoverRootProps;
}
