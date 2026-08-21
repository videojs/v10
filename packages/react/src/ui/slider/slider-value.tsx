import type { ForwardedRef, ReactNode } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import type { SliderRenderState } from '../hooks/use-slider';
import { useSliderContext, useSliderMotion } from './context';

export interface SliderValueProps extends UIComponentProps<'output', SliderRenderState> {
  /** Which slider value to display: the current position or the pointer position. */
  type?: 'current' | 'pointer' | undefined;
  /** Custom formatter for the displayed value. Overrides the root's `formatValue`. */
  format?: ((value: number) => string) | undefined;
}

interface MotionValueProps {
  format: ((value: number) => string) | undefined;
  formatValue: ((value: number, type: 'current' | 'pointer') => string) | undefined;
}

function MotionValue({ format, formatValue }: MotionValueProps): ReactNode {
  const { pointerValue } = useSliderMotion();
  return format
    ? format(pointerValue)
    : formatValue
      ? formatValue(pointerValue, 'pointer')
      : String(Math.round(pointerValue));
}

/** Displays a formatted text representation of the slider value. Renders an `<output>` element. */
export const SliderValue = forwardRef(function SliderValue(
  componentProps: SliderValueProps,
  forwardedRef: ForwardedRef<HTMLOutputElement>
) {
  const { render, className, style, type = 'current', format, ...elementProps } = componentProps;

  const context = useSliderContext();
  const { state, formatValue } = context;
  const text =
    type === 'pointer' ? (
      <MotionValue format={format} formatValue={formatValue} />
    ) : format ? (
      format(state.value)
    ) : formatValue ? (
      formatValue(state.value, 'current')
    ) : (
      String(Math.round(state.value))
    );

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
