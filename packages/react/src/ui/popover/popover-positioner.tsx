'use client';

import { PopoverDataAttrs, type PopoverState } from '@videojs/core';
import { getAnchorPositionStyle } from '@videojs/core/dom';
import { supportsAnchorPositioning } from '@videojs/utils/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { usePopoverContext } from './popover-context';

export interface PopoverPositionerProps extends UIComponentProps<'div', PopoverState> {}

const isAnchorSupported = /* @__PURE__ */ supportsAnchorPositioning();

export const PopoverPositioner = forwardRef(function PopoverPositioner(
  { render, className, style, ...elementProps }: PopoverPositionerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { state, anchorName, popover } = usePopoverContext();
  const internalRef = useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs(forwardedRef, internalRef);

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
    const posEl = internalRef.current;
    if (!triggerEl || !posEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const positionerRect = posEl.getBoundingClientRect();
    const boundaryRect = document.documentElement.getBoundingClientRect();

    setManualStyle(getAnchorPositionStyle(anchorName, posOpts, triggerRect, positionerRect, boundaryRect));
  }, [state.open, state.transitionStatus, anchorName, posOpts, popover]);

  // Anchor path uses computed styles; manual path uses measured styles
  // with `position: absolute` as a base before measurement completes.
  const positioningStyle = anchorStyle ?? manualStyle ?? { position: 'absolute' };

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
          role: 'presentation' as const,
          style: positioningStyle,
        },
        elementProps,
      ],
    }
  );
});

export namespace PopoverPositioner {
  export type Props = PopoverPositionerProps;
  export type State = PopoverState;
}
