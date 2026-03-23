'use client';

import { type TooltipProps as CoreTooltipProps, TooltipCore, TooltipDataAttrs } from '@videojs/core';
import { createTooltip, createTransition, type TooltipChangeDetails } from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { useDestroy } from '../../utils/use-destroy';
import { useLatestRef } from '../../utils/use-latest-ref';
import { useSafeId } from '../../utils/use-safe-id';
import { TooltipContextProvider } from './context';
import { useTooltipGroup } from './group-context';

export interface TooltipRootProps extends CoreTooltipProps {
  /** Called when the tooltip open state changes (fires immediately, before animations). */
  onOpenChange?: (open: boolean, details: TooltipChangeDetails) => void;
  /** Called after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  children?: ReactNode;
}

export function TooltipRoot({
  open: controlledOpen,
  defaultOpen = TooltipCore.defaultProps.defaultOpen,
  onOpenChange: onOpenChangeProp,
  onOpenChangeComplete: onOpenChangeCompleteProp,
  delay = TooltipCore.defaultProps.delay,
  closeDelay = TooltipCore.defaultProps.closeDelay,
  disableHoverablePopup = TooltipCore.defaultProps.disableHoverablePopup,
  disabled = TooltipCore.defaultProps.disabled,
  children,
  ...coreProps
}: TooltipRootProps): ReactNode {
  const [core] = useState(() => new TooltipCore(coreProps));
  core.setProps(coreProps);

  const isControlled = controlledOpen !== undefined;

  const groupFromContext = useTooltipGroup();

  // Keep refs that always point to the latest values so the
  // createTooltip closure never reads stale props.
  const onOpenChangeRef = useLatestRef(onOpenChangeProp);
  const onOpenChangeCompleteRef = useLatestRef(onOpenChangeCompleteProp);
  const delayRef = useLatestRef(delay);
  const closeDelayRef = useLatestRef(closeDelay);
  const disableHoverablePopupRef = useLatestRef(disableHoverablePopup);
  const disabledRef = useLatestRef(disabled);
  const groupRef = useLatestRef(groupFromContext);

  const [tooltip] = useState(() => {
    const instance = createTooltip({
      transition: createTransition(),
      onOpenChange: (nextOpen: boolean, details: TooltipChangeDetails) => {
        onOpenChangeRef.current?.(nextOpen, details);
      },
      onOpenChangeComplete: (nextOpen: boolean) => {
        onOpenChangeCompleteRef.current?.(nextOpen);
      },
      delay: () => delayRef.current,
      closeDelay: () => closeDelayRef.current,
      disableHoverablePopup: () => disableHoverablePopupRef.current,
      disabled: () => disabledRef.current,
      group: () => groupRef.current,
    });

    // Apply defaultOpen on creation (uncontrolled only)
    if (!isControlled && defaultOpen) {
      instance.open();
    }

    return instance;
  });

  const anchorName = useSafeId();
  const popupId = useSafeId('tooltip-');

  // Sync controlled open prop -> internal input state.
  useEffect(() => {
    if (controlledOpen === undefined) return;

    const { active: inputOpen } = tooltip.input.current;
    if (controlledOpen === inputOpen) return;

    if (controlledOpen) {
      tooltip.open();
    } else {
      tooltip.close();
    }
  }, [controlledOpen, tooltip]);

  useDestroy(tooltip);

  const input = useSnapshot(tooltip.input);
  core.setInput(input);
  const state = core.getState();

  return (
    <TooltipContextProvider value={{ core, tooltip, state, stateAttrMap: TooltipDataAttrs, anchorName, popupId }}>
      {children}
    </TooltipContextProvider>
  );
}

export namespace TooltipRoot {
  export type Props = TooltipRootProps;
}
