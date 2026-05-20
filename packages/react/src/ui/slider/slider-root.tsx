'use client';

import { SliderCore, SliderDataAttrs } from '@videojs/core';
import { getSliderCSSVars } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSlider } from '../hooks/use-slider';
import { SliderProvider } from './context';

/** Props for the Slider.Root component. */
export interface SliderRootProps extends UIComponentProps<'div', SliderCore.State>, SliderCore.Props {
  /** Called continuously while the value changes (e.g. during drag or keyboard input). */
  onValueChange?: ((value: number) => void) | undefined;
  /** Called once the user commits a value (pointer up, blur, or keyboard release). */
  onValueCommit?: ((value: number) => void) | undefined;
  /** Called when a drag interaction starts. */
  onDragStart?: (() => void) | undefined;
  /** Called when a drag interaction ends. */
  onDragEnd?: (() => void) | undefined;
}

/** Generic slider root that owns slider state and exposes shared context to nested parts. */
export const SliderRoot = forwardRef(function SliderRoot(
  componentProps: SliderRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const {
    render,
    className,
    style,
    label,
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
  core.setProps({ label, min, max, step, largeStep, orientation, disabled, thumbAlignment });

  const {
    state,
    cssVars,
    rootRef,
    thumbRef: sliderThumbRef,
    rootProps,
    rootStyle,
    thumbProps,
  } = useSlider({
    computeState: (input) => {
      core.setInput(input);
      return core.getSliderState(value);
    },
    getPercent: () => core.percentFromValue(value),
    getStepPercent: () => core.getStepPercent(),
    getLargeStepPercent: () => core.getLargeStepPercent(),
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
          props: [{ style: { ...cssVars, ...rootStyle } }, rootProps, elementProps],
        }
      )}
    </SliderProvider>
  );
});

export namespace SliderRoot {
  export type Props = SliderRootProps;
  export type State = SliderCore.State;
}
