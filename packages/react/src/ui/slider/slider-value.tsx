'use client';

import type { SliderState } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSliderContext } from './slider-context';

export interface SliderValueProps extends UIComponentProps<'output', SliderState> {
  type?: 'current' | 'pointer' | undefined;
  format?: ((value: number) => string) | undefined;
}

export const SliderValue = forwardRef(function SliderValue(
  componentProps: SliderValueProps,
  forwardedRef: ForwardedRef<HTMLOutputElement>
) {
  const { render, className, style, type = 'current', format, ...elementProps } = componentProps;

  const context = useSliderContext();
  if (!context) return null;

  const { state, pointerValue, formatValue } = context;

  const rawValue = type === 'pointer' ? pointerValue : state.value;

  const text = format ? format(rawValue) : formatValue ? formatValue(rawValue, type) : String(Math.round(rawValue));

  return renderElement(
    'output',
    { render, className, style },
    {
      state,
      stateAttrMap: context.stateAttrMap,
      ref: forwardedRef,
      props: [{ 'aria-live': 'off', children: text }, elementProps],
    }
  );
});

export namespace SliderValue {
  export type Props = SliderValueProps;
}
