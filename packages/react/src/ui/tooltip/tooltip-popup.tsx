'use client';

import type { TooltipState } from '@videojs/core';
import { TooltipCSSVars } from '@videojs/core';
import { getAnchorPositionStyle, resolveOffsets } from '@videojs/core/dom';
import { supportsAnchorPositioning } from '@videojs/utils/dom';
import type { CSSProperties } from 'react';
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { useTooltipContext } from './context';

export interface TooltipPopupProps extends UIComponentProps<'div', TooltipState> {}

const POPUP_RESET: CSSProperties = { position: 'fixed', inset: 'auto', margin: 0 };

/** Container for the tooltip content. Positioned relative to the trigger using CSS anchor positioning with a JavaScript fallback. */
export const TooltipPopup = forwardRef<HTMLDivElement, TooltipPopupProps>(function TooltipPopup(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { core, tooltip, state, stateAttrMap, anchorName, popupId } = useTooltipContext();
  const internalRef = useRef<HTMLDivElement>(null);

  const popupRef = useCallback(
    (el: HTMLDivElement | null) => {
      tooltip.setPopupElement(el);
      if (el && supportsAnchorPositioning()) {
        el.style.setProperty('position-anchor', `--${anchorName}`);
      }
    },
    [tooltip, anchorName]
  );

  const composedRef = useComposedRefs(forwardedRef, popupRef, internalRef);

  // --- Positioning ---

  const posOpts = useMemo(() => ({ side: state.side, align: state.align }), [state.side, state.align]);

  // CSS Anchor Positioning — computed from state, no measurement needed.
  // `position-anchor` is set imperatively in the ref callback above
  // because React's style prop silently drops unrecognised CSS properties.
  const anchorStyle = useMemo(() => {
    if (!supportsAnchorPositioning()) return null;
    const { positionAnchor: _, ...rest } = getAnchorPositionStyle(
      anchorName,
      posOpts,
      undefined,
      undefined,
      undefined,
      undefined,
      TooltipCSSVars
    );
    return rest as CSSProperties;
  }, [anchorName, posOpts]);

  // Manual fallback — measure rects after layout, before paint.
  const [manualStyle, setManualStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (supportsAnchorPositioning()) return;
    if (!state.open) {
      setManualStyle(null);
      return;
    }

    function measure(): void {
      const triggerEl = tooltip.triggerElement;
      const popupEl = internalRef.current;
      if (!triggerEl || !popupEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const popupRect = popupEl.getBoundingClientRect();
      const boundaryRect = document.documentElement.getBoundingClientRect();
      const offsets = resolveOffsets(popupEl, TooltipCSSVars);

      setManualStyle(
        getAnchorPositionStyle(
          anchorName,
          posOpts,
          triggerRect,
          popupRect,
          boundaryRect,
          offsets,
          TooltipCSSVars
        ) as CSSProperties
      );
    }

    measure();

    // Recompute on scroll/resize so the tooltip tracks its trigger.
    let rafId = 0;
    function reposition(): void {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    }

    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [state.open, anchorName, posOpts, tooltip]);

  // Anchor path uses computed styles; manual path uses measured styles;
  // fallback resets UA [popover] defaults until positioning is computed.
  const positioningStyle = anchorStyle ?? manualStyle ?? POPUP_RESET;

  // --- Visibility ---

  if (!state.open) {
    return null;
  }

  // Remap DOM focus events to React synthetic event names.
  const { onFocusOut, ...restPopupProps } = tooltip.popupProps;

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

export namespace TooltipPopup {
  export type Props = TooltipPopupProps;
  export type State = TooltipState;
}
