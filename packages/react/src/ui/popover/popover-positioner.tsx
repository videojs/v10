'use client';

import { PopoverDataAttrs, type PopoverState } from '@videojs/core';
import { getAnchorPositionStyle } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useId, useMemo } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { usePopoverContext } from './popover-context';

export interface PopoverPositionerProps extends UIComponentProps<'div', PopoverState> {}

export const PopoverPositioner = forwardRef(function PopoverPositioner(
  { render, className, style, ...elementProps }: PopoverPositionerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { state } = usePopoverContext();
  const anchorName = useId();

  const positioningStyle = useMemo(
    () =>
      getAnchorPositionStyle(anchorName, {
        side: state.side,
        align: state.align,
        sideOffset: state.sideOffset,
        alignOffset: state.alignOffset,
      }),
    [anchorName, state.side, state.align, state.sideOffset, state.alignOffset]
  );

  if (!state.open && state.transitionStatus === 'closed') {
    return null;
  }

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap: PopoverDataAttrs,
      ref: forwardedRef,
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
