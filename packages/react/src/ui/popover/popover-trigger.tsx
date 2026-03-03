'use client';

import { PopoverDataAttrs, type PopoverState } from '@videojs/core';
import { getAnchorNameStyle } from '@videojs/core/dom';
import { forwardRef, useCallback, useMemo } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { usePopoverContext } from './popover-context';

export interface PopoverTriggerProps extends UIComponentProps<'button', PopoverState> {}

/** Button that toggles the popover visibility. Renders a `<button>` element. */
export const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>(function PopoverTrigger(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { core, popover, state, anchorName, popupId } = usePopoverContext();

  const triggerRef = useCallback(
    (el: HTMLButtonElement | null) => {
      popover.setTriggerElement(el);
    },
    [popover]
  );

  const anchorStyle = useMemo(() => getAnchorNameStyle(anchorName), [anchorName]);

  // Remap DOM focus events to React synthetic event names.
  // createPopover() uses onFocusIn/onFocusOut (matching DOM focusin/focusout),
  // but React maps those to onFocus/onBlur.
  const { onFocusIn, onFocusOut, ...restTriggerProps } = popover.triggerProps;

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
          style: anchorStyle,
          ...core.getTriggerAttrs(state, popupId),
        },
        { ...restTriggerProps, onFocus: onFocusIn, onBlur: onFocusOut },
        elementProps,
      ],
    }
  );
});

export namespace PopoverTrigger {
  export type Props = PopoverTriggerProps;
  export type State = PopoverState;
}
