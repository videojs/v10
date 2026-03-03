'use client';

import type { SliderState } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSliderContext } from './slider-context';

export interface SliderTrackProps extends UIComponentProps<'div', SliderState> {}

/** Contains the slider's visual track and interactive hit zone. */
export const SliderTrack = forwardRef(function SliderTrack(
  componentProps: SliderTrackProps,
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

export namespace SliderTrack {
  export type Props = SliderTrackProps;
}
