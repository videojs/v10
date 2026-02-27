'use client';

import type { SliderState } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSliderContext } from './slider-context';

export interface SliderBufferProps extends UIComponentProps<'div', SliderState> {}

export const SliderBuffer = forwardRef(function SliderBuffer(
  componentProps: SliderBufferProps,
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

export namespace SliderBuffer {
  export type Props = SliderBufferProps;
}
