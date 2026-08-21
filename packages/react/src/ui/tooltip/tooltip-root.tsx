import { type TooltipProps as CoreTooltipProps, TooltipCore, TooltipDataAttrs } from '@videojs/core';
import {
  createTooltip,
  createTransition,
  type PositioningBoundary,
  type TooltipChangeDetails,
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
import { type TooltipContent, TooltipContextProvider } from './context';
import { useTooltipGroup } from './group-context';

export interface TooltipRootProps extends CoreTooltipProps {
  /** Boundary used to constrain the popup size. */
  boundary?: PositioningBoundary;
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
  boundary = 'container',
  children,
  ...coreProps
}: TooltipRootProps): ReactNode {
  const container = useOptionalContainer();
  const popupGroup = useOptionalPopupGroup();
  const controls = useOptionalControlsContext();

  const isControlled = !isUndefined(controlledOpen);
  const initialOpenRef = useRef(!isControlled && defaultOpen);

  const groupFromContext = useTooltipGroup();

  // Publish committed values before layout work so the retained tooltip never
  // reads abandoned or stale props.
  const onOpenChangeRef = useCommittedRef(onOpenChangeProp);
  const onOpenChangeCompleteRef = useCommittedRef(onOpenChangeCompleteProp);
  const delayRef = useCommittedRef(delay);
  const closeDelayRef = useCommittedRef(closeDelay);
  const disableHoverablePopupRef = useCommittedRef(disableHoverablePopup);
  const disabledRef = useCommittedRef(disabled);
  const groupRef = useCommittedRef(groupFromContext);
  const popupGroupRef = useCommittedRef(popupGroup);

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
      popupGroup: () => popupGroupRef.current,
    });

    return instance;
  });

  const [content, setContent] = useState<TooltipContent | undefined>();

  const anchorName = useSafeId();
  const popupId = useSafeId('tooltip');

  // Commit the initial uncontrolled default or the current controlled value.
  useLayoutEffect(() => {
    let nextOpen = controlledOpen;
    if (isUndefined(nextOpen)) {
      if (!initialOpenRef.current) return;
      initialOpenRef.current = false;
      nextOpen = true;
    }

    const { active: inputOpen } = tooltip.input.current;
    if (nextOpen === inputOpen) return;

    if (nextOpen) {
      tooltip.open();
    } else {
      tooltip.close();
    }
  }, [controlledOpen, tooltip]);

  useEffect(() => {
    if (isUndefined(controls?.state.visible)) return;
    if (controls.state.visible) return;

    tooltip.close('imperative-action');
  }, [controls?.state.visible, tooltip]);

  useDestroy(tooltip);

  const input = useSnapshot(tooltip.input);
  const core = new TooltipCore(coreProps);
  core.setInput(input);
  const { state, preferredSide, setPositionedSide } = usePositionedState(core.getState());

  return (
    <TooltipContextProvider
      value={{
        core,
        tooltip,
        state,
        preferredSide,
        setPositionedSide,
        stateAttrMap: TooltipDataAttrs,
        anchorName,
        popupId,
        content,
        setContent,
        boundary,
        container,
      }}
    >
      {children}
    </TooltipContextProvider>
  );
}

export namespace TooltipRoot {
  export type Props = TooltipRootProps;
}
