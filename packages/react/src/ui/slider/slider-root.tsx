import { SliderCore, SliderDataAttrs } from '@videojs/core';
import { getSliderCSSVars } from '@videojs/core/dom';
import { translateText } from '@videojs/core/i18n';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';
import { useTranslator } from '../../i18n/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { type SliderRenderState, useSlider } from '../hooks/use-slider';
import { SliderProvider } from './context';

export interface SliderRootProps
  extends UIComponentProps<'div', SliderRenderState<SliderCore.State>>,
    SliderCore.Props {
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

  const translator = useTranslator();
  const core = new SliderCore({ label, min, max, step, largeStep, orientation, disabled, thumbAlignment });

  const {
    state,
    motion,
    cssVars,
    rootRef,
    thumbRef: sliderThumbRef,
    rootProps,
    rootStyle,
    thumbProps,
  } = useSlider({
    computeState: (input) => {
      core.setInput({ ...SliderCore.defaultInput, ...input });
      return core.getSliderState(value);
    },
    getPercent: () => core.percentFromValue(value),
    getStepPercent: () => core.getStepPercent(),
    getLargeStepPercent: () => core.getLargeStepPercent(),
    orientation,
    disabled,
    thumbAlignment,
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
        motion,
        getPointerValue: (percent) => core.valueFromPercent(percent),
        thumbRef: sliderThumbRef,
        thumbProps,
        stateAttrMap: SliderDataAttrs,
        getAttrs: (sliderState, sliderMotion) => {
          const attrs = core.getAttrs({
            ...sliderState,
            pointerPercent: sliderMotion.pointerPercent,
            value: sliderState.dragging ? sliderMotion.pointerValue : sliderState.value,
          });
          return { ...attrs, 'aria-label': translateText(attrs['aria-label'], translator) };
        },
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
  export type State = SliderRenderState<SliderCore.State>;
}
