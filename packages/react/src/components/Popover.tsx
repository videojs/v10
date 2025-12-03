import type { PopoverState as CorePopoverState } from '@videojs/core';
import type { ReactNode } from 'react';
import type { Prettify } from '../types';
import type { ConnectedComponent } from '../utils/component-factory';

import { Popover as CorePopover } from '@videojs/core';
import { Children, cloneElement, useCallback, useEffect, useId, useState } from 'react';
import { toConnectedComponent, toContextComponent, useCore } from '../utils/component-factory';

type Placement = CorePopoverState['placement'];

export type PopoverState = Prettify<
  CorePopoverState & {
    popupId: string | undefined;
    updatePositioning: (placement: Placement, sideOffset: number) => void;
  }
>;

// ============================================================================
// ROOT COMPONENT
// ============================================================================

interface PopoverRootProps {
  openOnHover?: boolean;
  delay?: number;
  closeDelay?: number;
  children: ReactNode;
}

export function usePopoverRootState(props: PopoverRootProps): PopoverState {
  const { openOnHover = false, delay = 0, closeDelay = 0 } = props;
  const [placement, setPlacement] = useState<Placement>('top');
  const [sideOffset, setSideOffset] = useState(5);
  const uniqueId = useId();
  const popupId = uniqueId.replace(/^:([^:]+):$/, '«$1»');

  const coreState = useCore<CorePopover>(CorePopover, {
    openOnHover,
    delay,
    closeDelay,
    placement,
    sideOffset,
  });

  const updatePositioning = useCallback((newPlacement: Placement, newSideOffset: number) => {
    setPlacement(newPlacement);
    setSideOffset(newSideOffset);
  }, []);

  return {
    ...coreState,
    popupId,
    updatePositioning,
  };
}

export function usePopoverRootProps(props: PopoverRootProps, _state: PopoverState): { children: ReactNode } {
  return {
    children: props.children,
  };
}

export function renderPopoverRoot(props: { children: ReactNode }): JSX.Element {
  return <>{props.children}</>;
}

const PopoverRoot: ConnectedComponent<PopoverRootProps, typeof renderPopoverRoot> = toConnectedComponent(
  usePopoverRootState,
  usePopoverRootProps,
  renderPopoverRoot,
  'Popover.Root',
);

// ============================================================================
// TRIGGER COMPONENT
// ============================================================================

interface PopoverTriggerProps {
  children: ReactNode;
}

export function usePopoverTriggerProps(
  props: PopoverTriggerProps,
  context: PopoverState,
): { child: JSX.Element; triggerProps: Record<string, any> } {
  const { children } = props;
  const { _setTriggerElement, _open, popupId } = context;

  const child = Children.only(children) as JSX.Element;
  const existingStyle = (child.props as { style?: React.CSSProperties })?.style || {};

  return {
    child,
    triggerProps: {
      ref: _setTriggerElement,
      'data-popup-open': _open ? '' : undefined,
      commandfor: popupId ?? undefined,
      style: {
        ...existingStyle,
        ...(popupId ? { anchorName: `--${popupId}` as any } : {}),
      },
    },
  };
}

export function renderPopoverTrigger(props: { child: JSX.Element; triggerProps: Record<string, any> }): JSX.Element {
  // eslint-disable-next-line react/no-clone-element
  return cloneElement(props.child, props.triggerProps);
}

const PopoverTrigger: ConnectedComponent<PopoverTriggerProps, typeof renderPopoverTrigger> = toContextComponent(
  usePopoverTriggerProps,
  renderPopoverTrigger,
  'Popover.Trigger',
);

// ============================================================================
// POSITIONER COMPONENT
// ============================================================================

interface PopoverPositionerProps {
  side?: Placement;
  sideOffset?: number;
  children: ReactNode;
}

export function usePopoverPositionerProps(
  props: PopoverPositionerProps,
  context: PopoverState,
): { children: ReactNode } {
  const { side = 'top', sideOffset = 5, children } = props;
  const { updatePositioning } = context;

  useEffect(() => {
    updatePositioning(side, sideOffset);
  }, [side, sideOffset, updatePositioning]);

  return { children };
}

export function renderPopoverPositioner(props: { children: ReactNode }): JSX.Element {
  return <>{props.children}</>;
}

const PopoverPositioner: ConnectedComponent<PopoverPositionerProps, typeof renderPopoverPositioner>
  = toContextComponent(usePopoverPositionerProps, renderPopoverPositioner, 'Popover.Positioner');

// ============================================================================
// POPUP COMPONENT
// ============================================================================

interface PopoverPopupProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

interface PopoverPopupRenderProps extends React.ComponentProps<'div'> {
  children: ReactNode;
  'data-side': Placement;
  'data-starting-style': string | undefined;
  'data-open': string | undefined;
  'data-ending-style': string | undefined;
  'data-closed': string | undefined;
}

export function usePopoverPopupProps(props: PopoverPopupProps, context: PopoverState): PopoverPopupRenderProps {
  const { className, style, children, id } = props;
  const { _setPopoverElement, _transitionStatus, placement, popupId, _popoverStyle } = context;

  return {
    ref: _setPopoverElement,
    id: id ?? popupId ?? undefined,
    className,
    popover: 'manual' as const,
    style: {
      ..._popoverStyle,
      ...style,
    } as React.CSSProperties,
    'data-side': placement,
    'data-starting-style': _transitionStatus === 'initial' ? '' : undefined,
    'data-open': _transitionStatus === 'initial' || _transitionStatus === 'open' ? '' : undefined,
    'data-ending-style': _transitionStatus === 'close' || _transitionStatus === 'unmounted' ? '' : undefined,
    'data-closed': _transitionStatus === 'close' || _transitionStatus === 'unmounted' ? '' : undefined,
    children,
  };
}

export function renderPopoverPopup(props: PopoverPopupRenderProps): JSX.Element {
  return <div {...props} />;
}

const PopoverPopup: ConnectedComponent<PopoverPopupProps, typeof renderPopoverPopup> = toContextComponent(
  usePopoverPopupProps,
  renderPopoverPopup,
  'Popover.Popup',
);

// ============================================================================
// EXPORTS
// ============================================================================

export const Popover = Object.assign(
  {},
  {
    Root: PopoverRoot,
    Trigger: PopoverTrigger,
    Positioner: PopoverPositioner,
    Popup: PopoverPopup,
  },
) as {
  Root: typeof PopoverRoot;
  Trigger: typeof PopoverTrigger;
  Positioner: typeof PopoverPositioner;
  Popup: typeof PopoverPopup;
};

export default Popover;
