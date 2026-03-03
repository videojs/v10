'use client';

import { PopoverDataAttrs, type PopoverState } from '@videojs/core';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { usePopoverContext } from './popover-context';

export interface PopoverArrowProps extends UIComponentProps<'div', PopoverState> {}

/** Decorative arrow pointing from the popup toward the trigger. Hidden from assistive technology. */
export const PopoverArrow = forwardRef<HTMLDivElement, PopoverArrowProps>(function PopoverArrow(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { state } = usePopoverContext();

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap: PopoverDataAttrs,
      ref: forwardedRef,
      props: [
        {
          'aria-hidden': 'true' as const,
        },
        elementProps,
      ],
    }
  );
});

export namespace PopoverArrow {
  export type Props = PopoverArrowProps;
  export type State = PopoverState;
}
