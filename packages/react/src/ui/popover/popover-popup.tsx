'use client';

import { PopoverDataAttrs, type PopoverState } from '@videojs/core';
import { getAnchorPositionStyle } from '@videojs/core/dom';
import { supportsAnchorPositioning } from '@videojs/utils/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { usePopoverContext } from './popover-context';

export interface PopoverPopupProps extends UIComponentProps<'div', PopoverState> {}

const isAnchorSupported = /* @__PURE__ */ supportsAnchorPositioning();

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

  const posOpts = useMemo(
    () => ({
      side: state.side,
      align: state.align,
      sideOffset: state.sideOffset,
      alignOffset: state.alignOffset,
    }),
    [state.side, state.align, state.sideOffset, state.alignOffset]
  );

  // CSS Anchor Positioning — computed from state, no measurement needed.
  const anchorStyle = useMemo(() => {
    if (!isAnchorSupported) return null;
    return getAnchorPositionStyle(anchorName, posOpts);
  }, [anchorName, posOpts]);

  // Manual fallback — measure rects after layout, before paint.
  const [manualStyle, setManualStyle] = useState<Record<string, string> | null>(null);

  useLayoutEffect(() => {
    if (isAnchorSupported) return;
    if (!state.open || state.transitionStatus === 'closed') {
      setManualStyle(null);
      return;
    }

    const triggerEl = popover.triggerElement;
    const popupEl = internalRef.current;
    if (!triggerEl || !popupEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const popupRect = popupEl.getBoundingClientRect();
    const boundaryRect = document.documentElement.getBoundingClientRect();

    setManualStyle(getAnchorPositionStyle(anchorName, posOpts, triggerRect, popupRect, boundaryRect));
  }, [state.open, state.transitionStatus, anchorName, posOpts, popover]);

  // Anchor path uses computed styles; manual path uses measured styles.
  const positioningStyle = anchorStyle ?? manualStyle ?? { position: 'absolute' };

  // --- Visibility ---

  if (!state.open && state.transitionStatus === 'closed') {
    return null;
  }

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
        popover.popupProps,
        elementProps,
      ],
    }
  );
});

export namespace PopoverPopup {
  export type Props = PopoverPopupProps;
  export type State = PopoverState;
}
