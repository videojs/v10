import type { TooltipState as CoreTooltipState } from '@videojs/core';
import { Tooltip as CoreTooltip } from '@videojs/core';
import type { ReactNode } from 'react';
import { cloneElement, useCallback, useId, useState } from 'react';
import type { Prettify } from '../types';
import type { ConnectedComponent } from '../utils/component-factory';
import { toConnectedComponent, toContextComponent, useCore } from '../utils/component-factory';
import type { PopoverPopupProps, PopoverPopupRenderProps, PopoverPositionerProps, PopoverRootProps } from './Popover';
import { usePopoverPopupProps, usePopoverPositionerProps, usePopoverTriggerProps } from './Popover';

type Placement = CoreTooltipState['placement'];

export type TooltipState = Prettify<
  CoreTooltipState & {
    popupId: string | undefined;
    updatePositioning: (placement: Placement, sideOffset: number, collisionPadding: number) => void;
  }
>;

// ============================================================================
// ROOT COMPONENT
// ============================================================================

interface TooltipRootProps extends PopoverRootProps {
  trackCursorAxis?: 'x';
}

export function useTooltipRootState(props: TooltipRootProps): TooltipState {
  const { delay = 0, closeDelay = 0, trackCursorAxis } = props;
  const [placement, setPlacement] = useState<Placement>('top');
  const [sideOffset, setSideOffset] = useState(0);
  const [collisionPadding, setCollisionPadding] = useState(0);
  const uniqueId = useId();
  const popupId = uniqueId.replace(/^:([^:]+):$/, '«$1»');

  const coreState = useCore<CoreTooltip>(CoreTooltip, {
    delay,
    closeDelay,
    placement,
    sideOffset,
    collisionPadding,
    trackCursorAxis,
  });

  const updatePositioning = useCallback(
    (newPlacement: Placement, newSideOffset: number, newCollisionPadding: number) => {
      setPlacement(newPlacement);
      setSideOffset(newSideOffset);
      setCollisionPadding(newCollisionPadding);
    },
    []
  );

  return {
    ...coreState,
    popupId,
    updatePositioning,
  };
}

export function useTooltipRootProps(props: TooltipRootProps, _state: TooltipState): { children: ReactNode } {
  return {
    children: props.children,
  };
}

export function renderTooltipRoot(props: { children: ReactNode }): React.JSX.Element {
  return <>{props.children}</>;
}

const TooltipRoot: ConnectedComponent<TooltipRootProps, typeof renderTooltipRoot> = toConnectedComponent(
  useTooltipRootState,
  useTooltipRootProps,
  renderTooltipRoot,
  'Tooltip.Root'
);

// ============================================================================
// TRIGGER COMPONENT
// ============================================================================

interface TooltipTriggerProps {
  children: ReactNode;
}

export function useTooltipTriggerProps(
  props: TooltipTriggerProps,
  context: TooltipState
): { child: React.JSX.Element; triggerProps: Record<string, any> } {
  return usePopoverTriggerProps(props, context);
}

export function renderTooltipTrigger(props: {
  child: React.JSX.Element;
  triggerProps: Record<string, any>;
}): React.JSX.Element {
  // eslint-disable-next-line react/no-clone-element
  return cloneElement(props.child, props.triggerProps);
}

const TooltipTrigger: ConnectedComponent<TooltipTriggerProps, typeof renderTooltipTrigger> = toContextComponent(
  useTooltipTriggerProps,
  renderTooltipTrigger,
  'Tooltip.Trigger'
);

// ============================================================================
// POSITIONER COMPONENT
// ============================================================================

interface TooltipPositionerProps extends PopoverPositionerProps {}

export function useTooltipPositionerProps(
  props: TooltipPositionerProps,
  context: TooltipState
): { children: ReactNode } {
  return usePopoverPositionerProps(props, context);
}

export function renderTooltipPositioner(props: { children: ReactNode }): React.JSX.Element {
  return <>{props.children}</>;
}

const TooltipPositioner: ConnectedComponent<TooltipPositionerProps, typeof renderTooltipPositioner> =
  toContextComponent(useTooltipPositionerProps, renderTooltipPositioner, 'Tooltip.Positioner');

// ============================================================================
// POPUP COMPONENT
// ============================================================================

interface TooltipPopupProps extends PopoverPopupProps {}

interface TooltipPopupRenderProps extends PopoverPopupRenderProps {}

export function useTooltipPopupProps(props: TooltipPopupProps, context: TooltipState): TooltipPopupRenderProps {
  return usePopoverPopupProps(props, context);
}

export function renderTooltipPopup(props: TooltipPopupRenderProps): React.JSX.Element {
  return <div {...props} />;
}

const TooltipPopup: ConnectedComponent<TooltipPopupProps, typeof renderTooltipPopup> = toContextComponent(
  useTooltipPopupProps,
  renderTooltipPopup,
  'Tooltip.Popup'
);

// ============================================================================
// EXPORTS
// ============================================================================

export const Tooltip = Object.assign(
  {},
  {
    Root: TooltipRoot,
    Trigger: TooltipTrigger,
    Positioner: TooltipPositioner,
    Popup: TooltipPopup,
  }
) as {
  Root: typeof TooltipRoot;
  Trigger: typeof TooltipTrigger;
  Positioner: typeof TooltipPositioner;
  Popup: typeof TooltipPopup;
};

export default Tooltip;
