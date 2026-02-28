'use client';

import { SliderCore, SliderDataAttrs } from '@videojs/core';
import { getSliderCSSVars } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSlider } from '../hooks/use-slider';
import { SliderProvider } from './slider-context';

export interface SliderRootProps extends UIComponentProps<'div', SliderCore.State>, SliderCore.Props {
  value?: number | undefined;
  onValueChange?: ((value: number) => void) | undefined;
  onValueCommit?: ((value: number) => void) | undefined;
  onDragStart?: (() => void) | undefined;
  onDragEnd?: (() => void) | undefined;
}

export const SliderRoot = forwardRef(function SliderRoot(
  componentProps: SliderRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const {
    render,
    className,
    style,
    min,
    max,
    step,
    largeStep,
    orientation,
    disabled,
    thumbAlignment,
    value = 0,
    onValueChange,
    onValueCommit,
    onDragStart,
    onDragEnd,
    ...elementProps
  } = componentProps;

  const [core] = useState(() => new SliderCore());
  core.setProps({ min, max, step, largeStep, orientation, disabled, thumbAlignment });

  const { min: resolvedMin, max: resolvedMax, step: resolvedStep, largeStep: resolvedLargeStep } = core.props;
  const range = resolvedMax - resolvedMin || 1;

  const {
    state,
    cssVars,
    rootRef,
    thumbRef: sliderThumbRef,
    rootProps,
    thumbProps,
  } = useSlider({
    computeState: (interaction) => core.getState(interaction, value),
    getPercent: () => core.percentFromValue(value),
    getStepPercent: () => (resolvedStep / range) * 100,
    getLargeStepPercent: () => (resolvedLargeStep / range) * 100,
    orientation,
    disabled,
    adjustPercent: (rawPercent, thumbSize, trackSize) =>
      core.adjustPercentForAlignment(rawPercent, thumbSize, trackSize),
    getCSSVars: getSliderCSSVars,
    onValueChange: (percent) => onValueChange?.(core.valueFromPercent(percent)),
    onValueCommit: (percent) => onValueCommit?.(core.valueFromPercent(percent)),
    onDragStart,
    onDragEnd,
  });

  return (
    <SliderProvider
      value={{
        state,
        pointerValue: core.valueFromPercent(state.pointerPercent),
        thumbRef: sliderThumbRef,
        thumbProps,
        stateAttrMap: SliderDataAttrs,
        getAttrs: (sliderState) => core.getAttrs(sliderState),
        formatValue: undefined,
      }}
    >
      {renderElement(
        'div',
        { render, className, style },
        {
          state,
          stateAttrMap: SliderDataAttrs,
          ref: [forwardedRef, rootRef],
          props: [{ style: cssVars }, rootProps, elementProps],
        }
      )}
    </SliderProvider>
  );
});

export namespace SliderRoot {
  export type Props = SliderRootProps;
  export type State = SliderCore.State;
}
