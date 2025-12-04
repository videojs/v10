import type { TooltipState as CoreTooltipState } from '@videojs/core';
import type { ReactNode } from 'react';
import type { Prettify } from '../types';
import type { ConnectedComponent } from '../utils/component-factory';

import { Tooltip as CoreTooltip } from '@videojs/core';
import { Children, cloneElement, useCallback, useEffect, useId, useState } from 'react';
import { toConnectedComponent, toContextComponent, useCore } from '../utils/component-factory';
import { useMutationObserver } from '../utils/use-mutation-observer';

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

interface TooltipRootProps {
  delay?: number;
  closeDelay?: number;
  children: ReactNode;
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
    [],
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

export function renderTooltipRoot(props: { children: ReactNode }): JSX.Element {
  return <>{props.children}</>;
}

const TooltipRoot: ConnectedComponent<TooltipRootProps, typeof renderTooltipRoot> = toConnectedComponent(
  useTooltipRootState,
  useTooltipRootProps,
  renderTooltipRoot,
  'Tooltip.Root',
);

// ============================================================================
// TRIGGER COMPONENT
// ============================================================================

interface TooltipTriggerProps {
  children: ReactNode;
}

export function useTooltipTriggerProps(
  props: TooltipTriggerProps,
  context: TooltipState,
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

export function renderTooltipTrigger(props: { child: JSX.Element; triggerProps: Record<string, any> }): JSX.Element {
  // eslint-disable-next-line react/no-clone-element
  return cloneElement(props.child, props.triggerProps);
}

const TooltipTrigger: ConnectedComponent<TooltipTriggerProps, typeof renderTooltipTrigger> = toContextComponent(
  useTooltipTriggerProps,
  renderTooltipTrigger,
  'Tooltip.Trigger',
);

// ============================================================================
// POSITIONER COMPONENT
// ============================================================================

interface TooltipPositionerProps {
  side?: Placement;
  sideOffset?: number;
  collisionPadding?: number;
  collisionBoundary?: Element;
  children: ReactNode;
}

export function useTooltipPositionerProps(
  props: TooltipPositionerProps,
  context: TooltipState,
): { children: ReactNode } {
  const { side = 'top', sideOffset = 0, collisionPadding = 0, collisionBoundary, children } = props;
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

export function renderTooltipPositioner(props: { children: ReactNode }): JSX.Element {
  return <>{props.children}</>;
}

const TooltipPositioner: ConnectedComponent<TooltipPositionerProps, typeof renderTooltipPositioner>
  = toContextComponent(useTooltipPositionerProps, renderTooltipPositioner, 'Tooltip.Positioner');

// ============================================================================
// POPUP COMPONENT
// ============================================================================

interface TooltipPopupProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

interface TooltipPopupRenderProps extends React.ComponentProps<'div'> {
  children: ReactNode;
  'data-side': Placement;
  'data-starting-style': string | undefined;
  'data-open': string | undefined;
  'data-ending-style': string | undefined;
  'data-closed': string | undefined;
}

export function useTooltipPopupProps(props: TooltipPopupProps, context: TooltipState): TooltipPopupRenderProps {
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
    getDataAttributes(_triggerElement),
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
    { attributes: true },
  );

  return {
    ref: _setPopoverElement,
    id: id ?? popupId ?? undefined,
    className,
    role: 'tooltip',
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
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => [attr.name, attr.value]),
  );
}

export function renderTooltipPopup(props: TooltipPopupRenderProps): JSX.Element {
  return <div {...props} />;
}

const TooltipPopup: ConnectedComponent<TooltipPopupProps, typeof renderTooltipPopup> = toContextComponent(
  useTooltipPopupProps,
  renderTooltipPopup,
  'Tooltip.Popup',
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
  },
) as {
  Root: typeof TooltipRoot;
  Trigger: typeof TooltipTrigger;
  Positioner: typeof TooltipPositioner;
  Popup: typeof TooltipPopup;
};

export default Tooltip;
