'use client';

import { PopoverDataAttrs, type PopoverState } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef, useCallback, useId } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { usePopoverContext } from './popover-context';

export interface PopoverTriggerProps extends UIComponentProps<'button', PopoverState> {}

export const PopoverTrigger = forwardRef(function PopoverTrigger(
  { render, className, style, ...elementProps }: PopoverTriggerProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { core, popover, state } = usePopoverContext();
  const id = useId();

  const triggerRef = useCallback(
    (el: HTMLButtonElement | null) => {
      popover.setTriggerElement(el);
    },
    [popover]
  );

  return renderElement(
    'button',
    { render, className, style },
    {
      state,
      stateAttrMap: PopoverDataAttrs,
      ref: [forwardedRef, triggerRef],
      props: [
        {
          type: 'button' as const,
          id,
          ...core.getTriggerAttrs(state),
        },
        popover.triggerProps,
        elementProps,
      ],
    }
  );
});

export namespace PopoverTrigger {
  export type Props = PopoverTriggerProps;
  export type State = PopoverState;
}
