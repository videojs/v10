import type { PopoverState as CorePopoverState } from '@videojs/core';
import { Popover as CorePopover } from '@videojs/core';
import type { ReactNode } from 'react';
import { Children, cloneElement, useCallback, useEffect, useId, useState } from 'react';
import type { Prettify } from '../types';
import type { ConnectedComponent } from '../utils/component-factory';
import { toConnectedComponent, toContextComponent, useCore } from '../utils/component-factory';
import { useMutationObserver } from '../utils/use-mutation-observer';

type Placement = CorePopoverState['placement'];

export type PopoverState = Prettify<
  CorePopoverState & {
    popupId: string | undefined;
    updatePositioning: (placement: Placement, sideOffset: number, collisionPadding: number) => void;
  }
>;

// ============================================================================
// ROOT COMPONENT
// ============================================================================

export interface PopoverRootProps {
  openOnHover?: boolean;
  delay?: number;
  closeDelay?: number;
  children: ReactNode;
}

export function usePopoverRootState(props: PopoverRootProps): PopoverState {
  const { openOnHover = false, delay = 0, closeDelay = 0 } = props;
  const [placement, setPlacement] = useState<Placement>('top');
  const [sideOffset, setSideOffset] = useState(5);
  const [collisionPadding, setCollisionPadding] = useState(0);
  const uniqueId = useId();
  const popupId = uniqueId.replace(/^:([^:]+):$/, '«$1»');

  const coreState = useCore<CorePopover>(CorePopover, {
    openOnHover,
    delay,
    closeDelay,
    placement,
    sideOffset,
    collisionPadding,
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

export function usePopoverRootProps(props: PopoverRootProps, _state: PopoverState): { children: ReactNode } {
  return {
    children: props.children,
  };
}

export function renderPopoverRoot(props: { children: ReactNode }): React.JSX.Element {
  return <>{props.children}</>;
}

const PopoverRoot: ConnectedComponent<PopoverRootProps, typeof renderPopoverRoot> = toConnectedComponent(
  usePopoverRootState,
  usePopoverRootProps,
  renderPopoverRoot,
  'Popover.Root'
);

// ============================================================================
// TRIGGER COMPONENT
// ============================================================================

export interface PopoverTriggerProps {
  children: ReactNode;
}

export function usePopoverTriggerProps(
  props: PopoverTriggerProps,
  context: PopoverState
): { child: React.JSX.Element; triggerProps: Record<string, any> } {
  const { children } = props;
  const { _setTriggerElement, _open, popupId } = context;

  const child = Children.only(children) as React.JSX.Element;
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

export function renderPopoverTrigger(props: {
  child: React.JSX.Element;
  triggerProps: Record<string, any>;
}): React.JSX.Element {
  // eslint-disable-next-line react/no-clone-element
  return cloneElement(props.child, props.triggerProps);
}

const PopoverTrigger: ConnectedComponent<PopoverTriggerProps, typeof renderPopoverTrigger> = toContextComponent(
  usePopoverTriggerProps,
  renderPopoverTrigger,
  'Popover.Trigger'
);

// ============================================================================
// POSITIONER COMPONENT
// ============================================================================

export interface PopoverPositionerProps {
  side?: Placement;
  sideOffset?: number;
  collisionPadding?: number;
  collisionBoundary?: Element;
  children: ReactNode;
}

export function usePopoverPositionerProps(
  props: PopoverPositionerProps,
  context: PopoverState
): { children: ReactNode } {
  const { side = 'top', sideOffset = 5, collisionPadding = 0, collisionBoundary, children } = props;
  const { updatePositioning, _setCollisionBoundaryElement } = context;

  useEffect(() => {
    updatePositioning(side, sideOffset, collisionPadding);
  }, [side, sideOffset, collisionPadding, updatePositioning]);

  useEffect(() => {
    if (collisionBoundary) {
      _setCollisionBoundaryElement(collisionBoundary as HTMLElement);
    }
  }, [collisionBoundary, _setCollisionBoundaryElement]);

  return { children };
}

export function renderPopoverPositioner(props: { children: ReactNode }): React.JSX.Element {
  return <>{props.children}</>;
}

const PopoverPositioner: ConnectedComponent<PopoverPositionerProps, typeof renderPopoverPositioner> =
  toContextComponent(usePopoverPositionerProps, renderPopoverPositioner, 'Popover.Positioner');

// ============================================================================
// POPUP COMPONENT
// ============================================================================

export interface PopoverPopupProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

export interface PopoverPopupRenderProps extends React.ComponentProps<'div'> {
  children: ReactNode;
  'data-side': Placement;
  'data-starting-style': string | undefined;
  'data-open': string | undefined;
  'data-ending-style': string | undefined;
  'data-closed': string | undefined;
}

export function usePopoverPopupProps(props: PopoverPopupProps, context: PopoverState): PopoverPopupRenderProps {
  const { className, style, children, id } = props;
  const {
    _setPopoverElement,
    _transitionStatus,
    placement,
    popupId,
    _popoverStyle,
    _triggerElement,
    _popoverElement,
    _setCollisionBoundaryElement,
    _collisionBoundaryElement,
  } = context;

  // Set bounding box element for collision detection
  useEffect(() => {
    if (!_popoverElement) return;

    // Only set bounding box if it's not already set (to allow collisionBoundary from Positioner to take precedence)
    if (!_collisionBoundaryElement) {
      const mediaContainer = _popoverElement.closest('[data-media-container]') as HTMLElement | null;
      _setCollisionBoundaryElement(mediaContainer);
    }
  }, [_popoverElement, _collisionBoundaryElement, _setCollisionBoundaryElement]);

  // Track data attributes from trigger element, updating when element or attributes change
  const [dataAttrs, setDataAttrs] = useState<Record<string, string> | undefined>(() =>
    getDataAttributes(_triggerElement)
  );

  // Update data attributes when trigger element changes
  useEffect(() => {
    setDataAttrs(getDataAttributes(_triggerElement));
  }, [_triggerElement]);

  // Update data attributes when attributes mutate
  useMutationObserver(
    _triggerElement,
    () => {
      setDataAttrs(getDataAttributes(_triggerElement));
    },
    { attributes: true }
  );

  return {
    ref: _setPopoverElement,
    id: id ?? popupId ?? undefined,
    className,
    popover: 'manual' as const,
    style: {
      ..._popoverStyle,
      ...style,
    } as React.CSSProperties,
    ...dataAttrs,
    'data-side': placement,
    'data-starting-style': _transitionStatus === 'initial' ? '' : undefined,
    'data-open': _transitionStatus === 'initial' || _transitionStatus === 'open' ? '' : undefined,
    'data-ending-style': _transitionStatus === 'close' || _transitionStatus === 'unmounted' ? '' : undefined,
    'data-closed': _transitionStatus === 'close' || _transitionStatus === 'unmounted' ? '' : undefined,
    children,
  };
}

function getDataAttributes(element?: HTMLElement | null): Record<string, string> | undefined {
  if (!element) return undefined;
  return Object.fromEntries(
    Array.from(element.attributes)
      .filter((attr) => attr.name.startsWith('data-'))
      .map((attr) => [attr.name, attr.value])
  );
}

export function renderPopoverPopup(props: PopoverPopupRenderProps): React.JSX.Element {
  return <div {...props} />;
}

const PopoverPopup: ConnectedComponent<PopoverPopupProps, typeof renderPopoverPopup> = toContextComponent(
  usePopoverPopupProps,
  renderPopoverPopup,
  'Popover.Popup'
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
  }
) as {
  Root: typeof PopoverRoot;
  Trigger: typeof PopoverTrigger;
  Positioner: typeof PopoverPositioner;
  Popup: typeof PopoverPopup;
};

export default Popover;
