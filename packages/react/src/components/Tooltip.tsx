import type { ReactNode, RefObject } from 'react';

import { contains, getBoundingClientRectWithoutTransform, getInBoundsAdjustments } from '@videojs/utils/dom';

import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

type Placement = 'top' | 'top-start' | 'top-end';

interface UpdatePositioningProps {
  side: Placement;
  sideOffset: number;
  collisionPadding: number;
}

type TransitionStatus = 'initial' | 'open' | 'close' | 'unmounted';

interface TooltipContextType {
  popupRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  open: boolean;
  transitionStatus: TransitionStatus;
  updatePositioning: (props: UpdatePositioningProps) => void;
  trackCursorAxis?: 'x' | 'y' | 'both' | undefined;
  placement: Placement;
  sideOffset: number;
  collisionPadding: number;
  popupId: string | undefined;
}

interface TooltipRootProps {
  delay?: number;
  closeDelay?: number;
  children: ReactNode;
  trackCursorAxis?: 'x' | 'y' | 'both';
}

interface TooltipTriggerProps {
  children: ReactNode;
}

interface TooltipPositionerProps {
  side?: Placement;
  sideOffset?: number;
  collisionPadding?: number;
  children: ReactNode;
}

interface TooltipPopupProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

const TooltipContext = createContext<TooltipContextType | null>(null);

function useTooltipContext(): TooltipContextType {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('Tooltip components must be used within TooltipRoot');
  }
  return context;
}

function TooltipRoot({ delay = 0, closeDelay = 0, trackCursorAxis, children }: TooltipRootProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>('top');
  const [sideOffset, setSideOffset] = useState(0);
  const [collisionPadding, setCollisionPadding] = useState(0);
  const [transitionStatus, setTransitionStatus] = useState<TransitionStatus>('initial');
  const popupRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerPositionRef = useRef({ x: 0, y: 0 });
  const uniqueId = useId();
  const popupId = uniqueId.replace(/^:([^:]+):$/, '«$1»');

  const updatePositioning = useCallback(({ side, sideOffset, collisionPadding }: UpdatePositioningProps) => {
    setPlacement(side);
    setSideOffset(sideOffset);
    setCollisionPadding(collisionPadding);
  }, []);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const checkCollision = useCallback(() => {
    if (!popupRef.current || !triggerRef.current || !open) return;

    const mediaContainer = popupRef.current.closest('[data-media-container]') as HTMLElement | null;
    if (!mediaContainer) return;

    const popupRect = getBoundingClientRectWithoutTransform(popupRef.current);
    const boundsRect = getBoundingClientRectWithoutTransform(mediaContainer);
    const { x } = getInBoundsAdjustments(popupRect, boundsRect, collisionPadding);

    if (x !== 0) {
      if (trackCursorAxis) {
        const currentLeft = Number.parseFloat(popupRef.current.style.left || '0');
        popupRef.current.style.setProperty('left', `${currentLeft + x}px`);
      } else {
        popupRef.current.style.setProperty('translate', `${x}px -100%`);
      }
    } else {
      if (trackCursorAxis) {
        popupRef.current.style.setProperty('translate', '-50% -100%');
      } else {
        popupRef.current.style.setProperty('translate', '0 -100%');
      }
    }
  }, [open, collisionPadding, trackCursorAxis]);

  const updatePosition = useCallback(() => {
    if (open && trackCursorAxis && popupRef.current) {
      popupRef.current.style.setProperty('left', `${pointerPositionRef.current.x}px`);
      checkCollision();
    }
  }, [open, trackCursorAxis, checkCollision]);

  const setOpenState = useCallback(
    (newOpen: boolean) => {
      if (open === newOpen) return;

      setOpen(newOpen);

      if (newOpen) {
        setTransitionStatus('initial');
        if (popupRef.current) {
          popupRef.current.showPopover();
        }
        requestAnimationFrame(() => {
          setTransitionStatus('open');
          checkCollision();
        });
      } else {
        setTransitionStatus('close');
      }
    },
    [open, checkCollision],
  );

  useEffect(() => {
    if (!popupRef.current || open) return;

    const transitions = popupRef.current.getAnimations().filter(anim => anim instanceof CSSTransition);
    if (transitions.length > 0) {
      Promise.all(transitions.map(t => t.finished))
        .then(() => popupRef.current?.hidePopover())
        .catch(() => popupRef.current?.hidePopover());
    } else {
      popupRef.current.hidePopover();
    }
  }, [open, transitionStatus]);

  useEffect(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) return;

    const abortController = new AbortController();
    const { signal } = abortController;

    const handlePointerEnter = () => {
      clearHoverTimeout();

      hoverTimeoutRef.current = setTimeout(() => {
        setOpenState(true);
      }, delay);
    };

    const handlePointerLeave = () => {
      clearHoverTimeout();

      hoverTimeoutRef.current = setTimeout(() => {
        setOpenState(false);
      }, closeDelay);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (trackCursorAxis) {
        pointerPositionRef.current = { x: event.clientX, y: event.clientY };
        if (open) {
          updatePosition();
        }
      }
    };

    const handleFocusIn = () => {
      setOpenState(true);
    };

    const handleFocusOut = (event: FocusEvent) => {
      const relatedTarget = event.relatedTarget as HTMLElement;
      if (relatedTarget && popup && contains(popup, relatedTarget)) return;
      setOpenState(false);
    };

    if (globalThis.matchMedia?.('(hover: hover)')?.matches) {
      // Event listeners are automatically removed when AbortController is aborted
      trigger.addEventListener('pointerenter', handlePointerEnter, { signal });
      trigger.addEventListener('pointerleave', handlePointerLeave, { signal });

      if (trackCursorAxis) {
        trigger.addEventListener('pointermove', handlePointerMove, { signal });
      }
    }

    // Event listeners are automatically removed when AbortController is aborted
    trigger.addEventListener('focusin', handleFocusIn, { signal });
    trigger.addEventListener('focusout', handleFocusOut, { signal });

    return () => {
      abortController.abort();
      clearHoverTimeout();
    };
  }, [delay, closeDelay, trackCursorAxis, open, setOpenState, clearHoverTimeout, updatePosition]);

  useEffect(() => {
    if (!popupRef.current || !triggerRef.current) return;

    const popup = popupRef.current;
    const [side, alignment] = placement.split('-');
    popup.style.setProperty('top', `calc(anchor(${side}) - ${sideOffset}px)`);

    if (trackCursorAxis) {
      popup.style.setProperty('translate', `-50% -100%`);
    } else {
      popup.style.setProperty('translate', `0 -100%`);
      popup.style.setProperty('justify-self', alignment === 'start'
        ? 'anchor-start'
        : alignment === 'end'
          ? 'anchor-end'
          : 'anchor-center');
    }
  }, [placement, sideOffset, trackCursorAxis]);

  useEffect(() => {
    if (!popupRef.current) return;

    const resizeObserver = new ResizeObserver(checkCollision);
    resizeObserver.observe(popupRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [checkCollision]);

  const value: TooltipContextType = useMemo(
    () => ({
      popupRef,
      triggerRef,
      open,
      transitionStatus,
      updatePositioning,
      trackCursorAxis,
      placement,
      sideOffset,
      collisionPadding,
      popupId,
    }),
    [open, transitionStatus, updatePositioning, trackCursorAxis, placement, sideOffset, collisionPadding, popupId],
  );

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
}

function TooltipTrigger({ children }: TooltipTriggerProps): JSX.Element {
  const { triggerRef, open, popupId } = useTooltipContext();

  const child = Children.only(children) as JSX.Element;
  const existingStyle = (child.props as { style?: React.CSSProperties })?.style || {};

  // eslint-disable-next-line react/no-clone-element
  return cloneElement(child, {
    ref: triggerRef,
    'data-popup-open': open ? '' : undefined,
    commandfor: popupId ?? undefined,
    style: {
      ...existingStyle,
      ...(popupId ? { anchorName: `--${popupId}` as any } : {}),
    },
  });
}

function TooltipPositioner({
  side = 'top',
  sideOffset = 0,
  collisionPadding = 0,
  children,
}: TooltipPositionerProps): JSX.Element | null {
  const { updatePositioning } = useTooltipContext();

  useEffect(() => {
    updatePositioning({ side, sideOffset, collisionPadding });
  }, [side, sideOffset, collisionPadding, updatePositioning]);

  return <>{children}</>;
}

function TooltipPopup({ className = '', style, children }: TooltipPopupProps): JSX.Element | null {
  const { popupRef, triggerRef, transitionStatus, placement, popupId } = useTooltipContext();
  const triggerElement = triggerRef.current;

  // Copy data attributes from trigger element
  const dataAttributes = useMemo(() => {
    if (!triggerElement?.attributes) return {};
    return Object.fromEntries(
      Array.from(triggerElement.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => [attr.name, attr.value]),
    );
  }, [triggerElement]);

  return (
    <div
      ref={popupRef as RefObject<HTMLDivElement>}
      id={popupId ?? undefined}
      className={className}
      role="tooltip"
      popover="manual"
      style={{
        ...(popupId ? { positionAnchor: `--${popupId}` as any } : {}),
        ...style,
      }}
      {...dataAttributes}
      data-side={placement}
      data-starting-style={transitionStatus === 'initial' ? '' : undefined}
      data-open={transitionStatus === 'initial' || transitionStatus === 'open' ? '' : undefined}
      data-ending-style={transitionStatus === 'close' || transitionStatus === 'unmounted' ? '' : undefined}
      data-closed={transitionStatus === 'close' || transitionStatus === 'unmounted' ? '' : undefined}
    >
      {children}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const Tooltip: {
  Root: typeof TooltipRoot;
  Trigger: typeof TooltipTrigger;
  Positioner: typeof TooltipPositioner;
  Popup: typeof TooltipPopup;
} = {
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Positioner: TooltipPositioner,
  Popup: TooltipPopup,
};

export default Tooltip;
