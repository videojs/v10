'use client';

import type { PopoverState } from '@videojs/core';
import {
  getAnchorPositionStyle,
  getPopupPositionRect,
  getPositioningBoundaryRect,
  isEventWithinElement,
  resolveOffsets,
  resolvePositioningBoundary,
} from '@videojs/core/dom';
import { supportsAnchorPositioning } from '@videojs/utils/dom';
import type { CSSProperties } from 'react';
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { usePopoverContext } from './context';

export interface PopoverPopupProps extends UIComponentProps<'div', PopoverState> {}

const POPOVER_RESET: CSSProperties = { position: 'fixed', inset: 'auto', margin: 0 };

/** Container for the popover content. Positioned relative to the trigger using CSS anchor positioning with a JavaScript fallback. */
export const PopoverPopup = forwardRef<HTMLDivElement, PopoverPopupProps>(function PopoverPopup(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { core, popover, state, stateAttrMap, anchorName, popupId, boundary, container } = usePopoverContext();
  const internalRef = useRef<HTMLDivElement>(null);

  const popupRef = useCallback(
    (el: HTMLDivElement | null) => {
      popover.setPopupElement(el);
      if (el && supportsAnchorPositioning()) {
        el.style.setProperty('position-anchor', `--${anchorName}`);
      }
    },
    [popover, anchorName]
  );

  const composedRef = useComposedRefs(forwardedRef, popupRef, internalRef);

  // --- Positioning ---

  const posOpts = useMemo(() => ({ side: state.side, align: state.align }), [state.side, state.align]);

  // CSS Anchor Positioning — computed from state, no measurement needed.
  // `position-anchor` is set imperatively in the ref callback above
  // because React's style prop silently drops unrecognised CSS properties.
  const anchorStyle = useMemo(() => {
    if (!supportsAnchorPositioning()) return null;
    const { positionAnchor: _, ...rest } = getAnchorPositionStyle(anchorName, posOpts);
    return rest as CSSProperties;
  }, [anchorName, posOpts]);

  // Manual fallback — measure rects after layout, before paint.
  const [manualStyle, setManualStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!state.open) {
      setManualStyle(null);
      return;
    }

    function measure(): void {
      const triggerEl = popover.triggerElement;
      const popupEl = internalRef.current;
      if (!triggerEl || !popupEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const root = popupEl.getRootNode() as Document | ShadowRoot;
      const boundaryElement = resolvePositioningBoundary(boundary, { container, root });
      const popupRect = supportsAnchorPositioning() ? undefined : getPopupPositionRect(popupEl);
      const boundaryRect = getPositioningBoundaryRect(boundaryElement);
      const offsets = resolveOffsets(popupEl);

      const { positionAnchor: _, ...nextStyle } = getAnchorPositionStyle(
        anchorName,
        posOpts,
        triggerRect,
        popupRect,
        boundaryRect,
        offsets
      );

      setManualStyle(nextStyle as CSSProperties);
    }

    measure();
    const triggerEl = popover.triggerElement;
    const popupEl = internalRef.current;
    const boundaryElement = popupEl
      ? resolvePositioningBoundary(boundary, {
          container,
          root: popupEl.getRootNode() as Document | ShadowRoot,
        })
      : null;

    let rafId = 0;
    function reposition(event?: Event): void {
      if (event && isEventWithinElement(event, internalRef.current)) return;

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    }

    // Re-measure after the popover has entered the top layer and whenever
    // its own size or the trigger size changes.
    reposition();

    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            reposition();
          })
        : null;

    if (triggerEl && resizeObserver) {
      resizeObserver.observe(triggerEl);
    }

    if (popupEl && resizeObserver) {
      resizeObserver.observe(popupEl);
    }
    if (boundaryElement && resizeObserver) {
      resizeObserver.observe(boundaryElement);
    }

    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [state.open, anchorName, posOpts, popover, boundary, container]);

  // Anchor path uses computed styles; manual path uses measured styles;
  // fallback resets UA [popover] defaults until positioning is computed.
  const positioningStyle = manualStyle ?? anchorStyle ?? POPOVER_RESET;

  // --- Visibility ---

  if (!state.open) {
    return null;
  }

  // Remap DOM focus events to React synthetic event names.
  const { onFocusOut, ...restPopupProps } = popover.popupProps;

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: composedRef,
      props: [
        {
          id: popupId,
          style: positioningStyle,
          ...core.getPopupAttrs(state),
        },
        { ...restPopupProps, onBlur: onFocusOut },
        elementProps,
      ],
    }
  );
});

export namespace PopoverPopup {
  export type Props = PopoverPopupProps;
  export type State = PopoverState;
}
