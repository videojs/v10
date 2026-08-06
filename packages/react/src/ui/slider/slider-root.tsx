'use client';

import { SliderCore, SliderCSSVars, SliderDataAttrs } from '@videojs/core';
import { getSliderCSSVars } from '@videojs/core/dom';
import { translateText } from '@videojs/core/i18n';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';
import { useTranslator } from '../../i18n/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSafeId } from '../../utils/use-safe-id';
import { useSlider } from '../hooks/use-slider';
import { SliderProvider } from './context';

export interface SliderRootProps extends UIComponentProps<'div', SliderCore.State>, SliderCore.Props {
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

  const [core] = useState(() => new SliderCore());
  const [trackClipPath, setTrackClipPath] = useState<string>();
  const id = useSafeId('slider');
  const translator = useTranslator();
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
        id,
        min: core.props.min,
        max: core.props.max,
        state,
        pointerValue: core.valueFromPercent(state.pointerPercent),
        thumbRef: sliderThumbRef,
        thumbProps,
        stateAttrMap: SliderDataAttrs,
        setTrackClipPath,
        getAttrs: (sliderState) => {
          const attrs = core.getAttrs(sliderState);
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
          props: [
            {
              style: {
                ...cssVars,
                ...(trackClipPath && { [SliderCSSVars.clipPath]: trackClipPath }),
                ...rootStyle,
              },
            },
            rootProps,
            elementProps,
          ],
        }
      )}
    </SliderProvider>
  );
});

export namespace SliderRoot {
  export type Props = SliderRootProps;
  export type State = SliderCore.State;
}
