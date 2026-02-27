'use client';

import { PopoverDataAttrs, type PopoverState } from '@videojs/core';
import { getAnchorPositionStyle, resolveOffsets } from '@videojs/core/dom';
import { supportsAnchorPositioning } from '@videojs/utils/dom';
import type { CSSProperties, ForwardedRef } from 'react';
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { usePopoverContext } from './popover-context';

export interface PopoverPopupProps extends UIComponentProps<'div', PopoverState> {}

const isAnchorSupported = /* @__PURE__ */ supportsAnchorPositioning();

const POPOVER_RESET: CSSProperties = { position: 'fixed', inset: 'auto', margin: 0 };

/**
 * Convert a kebab-case CSS property name to camelCase for React style objects.
 * Custom properties (--*) are returned as-is.
 */
function toCamelCase(prop: string): string {
  if (prop.startsWith('--')) return prop;
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Convert a Record<kebab-case, string> to a React CSSProperties object. */
function toReactStyle(styles: Record<string, string>): CSSProperties {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(styles)) {
    result[toCamelCase(key)] = value;
  }
  return result as unknown as CSSProperties;
}

export const PopoverPopup = forwardRef(function PopoverPopup(
  { render, className, style, ...elementProps }: PopoverPopupProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { core, popover, state, anchorName, popupId } = usePopoverContext();
  const internalRef = useRef<HTMLDivElement>(null);

  const popupRef = useCallback(
    (el: HTMLDivElement | null) => {
      popover.setPopupElement(el);
    },
    [popover]
  );

  const composedRef = useComposedRefs(forwardedRef, popupRef, internalRef);

  // --- Positioning ---

  const posOpts = useMemo(() => ({ side: state.side, align: state.align }), [state.side, state.align]);

  // CSS Anchor Positioning — computed from state, no measurement needed.
  const anchorStyle = useMemo(() => {
    if (!isAnchorSupported) return null;
    return toReactStyle(getAnchorPositionStyle(anchorName, posOpts));
  }, [anchorName, posOpts]);

  // Manual fallback — measure rects after layout, before paint.
  const [manualStyle, setManualStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (isAnchorSupported) return;
    if (!state.open || state.transitionStatus === 'closed') {
      setManualStyle(null);
      return;
    }

    function measure(): void {
      const triggerEl = popover.triggerElement;
      const popupEl = internalRef.current;
      if (!triggerEl || !popupEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const popupRect = popupEl.getBoundingClientRect();
      const boundaryRect = document.documentElement.getBoundingClientRect();
      const offsets = resolveOffsets(popupEl);

      setManualStyle(
        toReactStyle(getAnchorPositionStyle(anchorName, posOpts, triggerRect, popupRect, boundaryRect, offsets))
      );
    }

    measure();

    // Recompute on scroll/resize so the popover tracks its trigger.
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
  }, [state.open, state.transitionStatus, anchorName, posOpts, popover]);

  // Anchor path uses computed styles; manual path uses measured styles;
  // fallback resets UA [popover] defaults until positioning is computed.
  const positioningStyle = anchorStyle ?? manualStyle ?? POPOVER_RESET;

  // --- Visibility ---

  if (!state.open && state.transitionStatus === 'closed') {
    return null;
  }

  // Remap DOM focus events to React synthetic event names.
  const { onFocusOut, ...restPopupProps } = popover.popupProps;

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap: PopoverDataAttrs,
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
