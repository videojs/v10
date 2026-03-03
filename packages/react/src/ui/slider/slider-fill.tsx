'use client';

import type { SliderState } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSliderContext } from './slider-context';

export interface SliderFillProps extends UIComponentProps<'div', SliderState> {}

/** Displays the filled portion from start to the current value. */
export const SliderFill = forwardRef(function SliderFill(
  componentProps: SliderFillProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, ...elementProps } = componentProps;

  const context = useSliderContext();
  if (!context) return null;

  return renderElement(
    'div',
    { render, className, style },
    {
      state: context.state,
      stateAttrMap: context.stateAttrMap,
      ref: forwardedRef,
      props: [elementProps],
    }
  );
});

export namespace SliderFill {
  export type Props = SliderFillProps;
}
