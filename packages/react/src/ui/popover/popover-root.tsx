'use client';

import { type PopoverRootProps as CorePopoverRootProps, PopoverCore } from '@videojs/core';
import { createPopover, type PopoverChangeDetails } from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import type { ReactNode } from 'react';
import { useEffect, useId, useState } from 'react';

import { useLatestRef } from '../../utils/use-latest-ref';
import { PopoverContextProvider } from './popover-context';

export interface PopoverRootProps extends CorePopoverRootProps {
  /** Called when the popover open state changes (fires immediately, before animations). */
  onOpenChange?: (open: boolean, details: PopoverChangeDetails) => void;
  /** Called after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  children?: ReactNode;
}

export function PopoverRoot({
  open: controlledOpen,
  defaultOpen = PopoverCore.defaultRootProps.defaultOpen,
  onOpenChange: onOpenChangeProp,
  onOpenChangeComplete: onOpenChangeCompleteProp,
  openOnHover = PopoverCore.defaultRootProps.openOnHover,
  delay = PopoverCore.defaultRootProps.delay,
  closeDelay = PopoverCore.defaultRootProps.closeDelay,
  children,
  ...coreProps
}: PopoverRootProps): ReactNode {
  const [core] = useState(() => new PopoverCore(coreProps));
  core.setProps(coreProps);

  const isControlled = controlledOpen !== undefined;

  // Keep refs that always point to the latest values so the
  // createPopover closure never reads stale props.
  const onOpenChangeRef = useLatestRef(onOpenChangeProp);
  const onOpenChangeCompleteRef = useLatestRef(onOpenChangeCompleteProp);
  const closeOnEscapeRef = useLatestRef(coreProps.closeOnEscape);
  const closeOnOutsideClickRef = useLatestRef(coreProps.closeOnOutsideClick);
  const openOnHoverRef = useLatestRef(openOnHover);
  const delayRef = useLatestRef(delay);
  const closeDelayRef = useLatestRef(closeDelay);

  const [popover] = useState(() => {
    const instance = createPopover({
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
    });

    // Apply defaultOpen on creation (uncontrolled only)
    if (!isControlled && defaultOpen) {
      instance.open('click');
    }

    return instance;
  });

  // useId() returns values like `:r0:` which contain colons — invalid
  // in CSS <dashed-ident> tokens (used by anchor-name / position-anchor).
  // Strip non-alphanumeric/underscore/hyphen characters to produce a
  // safe identifier.
  const anchorName = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const popupId = useId();

  // Sync controlled open prop -> internal interaction state.
  useEffect(() => {
    if (controlledOpen === undefined) return;

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

  return (
    <PopoverContextProvider value={{ core, popover, state, anchorName, popupId }}>{children}</PopoverContextProvider>
  );
}

export namespace PopoverRoot {
  export type Props = PopoverRootProps;
}
