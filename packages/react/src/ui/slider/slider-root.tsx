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
  onValueChange?: ((percent: number) => void) | undefined;
  onValueCommit?: ((percent: number) => void) | undefined;
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
    rootRef,
    thumbRef: sliderThumbRef,
    rootElement,
    thumbElement,
    rootProps,
    thumbProps,
  } = useSlider({
    computeState: (interaction) => core.getState(interaction, value),
    getPercent: () => core.percentFromValue(value),
    getStepPercent: () => (resolvedStep / range) * 100,
    getLargeStepPercent: () => (resolvedLargeStep / range) * 100,
    orientation,
    disabled,
    onValueChange: (percent) => onValueChange?.(core.valueFromPercent(percent)),
    onValueCommit: (percent) => onValueCommit?.(core.valueFromPercent(percent)),
    onDragStart,
    onDragEnd,
  });

  // Adjust CSS var percents for edge thumb alignment (requires DOM measurement).
  const rootEl = rootElement.current;
  const thumbEl = thumbElement.current;
  let cssState = state;

  if (state.thumbAlignment === 'edge' && rootEl && thumbEl) {
    const isH = state.orientation === 'horizontal';
    const thumbSize = isH ? thumbEl.offsetWidth : thumbEl.offsetHeight;
    const trackSize = isH ? rootEl.offsetWidth : rootEl.offsetHeight;
    cssState = {
      ...state,
      fillPercent: core.adjustPercentForAlignment(state.fillPercent, thumbSize, trackSize),
      pointerPercent: core.adjustPercentForAlignment(state.pointerPercent, thumbSize, trackSize),
    };
  }

  const cssVars = getSliderCSSVars(cssState);

  return (
    <SliderProvider
      value={{
        state,
        thumbRef: sliderThumbRef,
        thumbProps,
        stateAttrMap: SliderDataAttrs,
        getAttrs: (s) => core.getAttrs(s),
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
