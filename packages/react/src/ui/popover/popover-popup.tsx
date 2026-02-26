'use client';

import { PopoverDataAttrs, type PopoverState } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef, useCallback } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { usePopoverContext } from './popover-context';

export interface PopoverPopupProps extends UIComponentProps<'div', PopoverState> {}

export const PopoverPopup = forwardRef(function PopoverPopup(
  { render, className, style, ...elementProps }: PopoverPopupProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { core, popover, state, popupId } = usePopoverContext();

  const popupRef = useCallback(
    (el: HTMLDivElement | null) => {
      popover.setPopupElement(el);
    },
    [popover]
  );

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap: PopoverDataAttrs,
      ref: [forwardedRef, popupRef],
      props: [{ id: popupId, ...core.getPopupAttrs(state) }, popover.popupProps, elementProps],
    }
  );
});

export namespace PopoverPopup {
  export type Props = PopoverPopupProps;
  export type State = PopoverState;
}
