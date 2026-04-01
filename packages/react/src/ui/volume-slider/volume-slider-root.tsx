'use client';

import { VolumeSliderCore, VolumeSliderDataAttrs } from '@videojs/core';
import { createWheelStep, getSliderCSSVars, logMissingFeature, selectVolume } from '@videojs/core/dom';
import { listen } from '@videojs/utils/dom';
import { forwardRef, useLayoutEffect, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useLatestRef } from '../../utils/use-latest-ref';
import { renderElement } from '../../utils/use-render';
import { useSlider } from '../hooks/use-slider';
import { SliderProvider } from '../slider/context';

const noopVolume = {
  volume: 0,
  muted: false,
  volumeAvailability: 'unsupported' as const,
  setVolume: () => 0,
  toggleMuted: () => false,
};

export interface VolumeSliderRootProps extends UIComponentProps<'div', VolumeSliderCore.State>, VolumeSliderCore.Props {
  onDragStart?: (() => void) | undefined;
  onDragEnd?: (() => void) | undefined;
}

export const VolumeSliderRoot = forwardRef<HTMLDivElement, VolumeSliderRootProps>(
  function VolumeSliderRoot(componentProps, forwardedRef) {
    const {
      render,
      className,
      style,
      label,
      orientation,
      step = VolumeSliderCore.defaultProps.step,
      largeStep = VolumeSliderCore.defaultProps.largeStep,
      disabled,
      thumbAlignment,
      onDragStart,
      onDragEnd,
      ...elementProps
    } = componentProps;

    const volume = usePlayer(selectVolume);

    const [core] = useState(() => new VolumeSliderCore());
    core.setProps({ label, orientation, step, largeStep, disabled, thumbAlignment });

    // Keep a ref to the latest volume state for callbacks.
    const volumeRef = useLatestRef(volume);

    const getPercent = () => (volumeRef.current?.volume ?? 0) * 100;
    const getStepPercent = () => core.getStepPercent();
    const setVolume = (percent: number) => volumeRef.current?.setVolume(percent / 100);

    const { state, cssVars, rootRef, thumbRef, rootProps, rootStyle, thumbProps } = useSlider<VolumeSliderCore.State>({
      computeState: (input) => {
        core.setInput(input);
        core.setMedia(volume ?? noopVolume);
        return core.getState();
      },
      getPercent,
      getStepPercent,
      getLargeStepPercent: () => core.getLargeStepPercent(),
      orientation,
      disabled,
      adjustPercent: (rawPercent, thumbSize, trackSize) =>
        core.adjustPercentForAlignment(rawPercent, thumbSize, trackSize),
      getCSSVars: getSliderCSSVars,
      onValueChange: setVolume,
      onValueCommit: setVolume,
      onDragStart,
      onDragEnd,
    });

    // Attach wheel listener directly to the DOM with { passive: false } so
    // preventDefault() can block page scroll. React's onWheel is passive.
    const wheelRef = useRef<HTMLElement | null>(null);

    const [wheelStep] = useState(() =>
      createWheelStep({
        isDisabled: () => !!disabled || !volumeRef.current,
        getPercent: () => (volumeRef.current?.volume ?? 0) * 100,
        getStepPercent: () => core.getStepPercent(),
        onValueChange: (percent) => volumeRef.current?.setVolume(percent / 100),
      })
    );

    useLayoutEffect(() => {
      const el = wheelRef.current;
      if (!el) return;
      return listen(el, 'wheel', wheelStep.onWheel, { passive: false });
    }, [wheelStep]);

    if (!volume) {
      if (__DEV__) logMissingFeature('VolumeSlider', 'volume');
      return null;
    }

    return (
      <SliderProvider
        value={{
          state,
          pointerValue: core.valueFromPercent(state.pointerPercent),
          thumbRef,
          thumbProps,
          stateAttrMap: VolumeSliderDataAttrs,
          getAttrs: (sliderState) => core.getAttrs(sliderState as VolumeSliderCore.State),
          formatValue: (value) => `${Math.round(value)}%`,
        }}
      >
        {renderElement(
          'div',
          { render, className, style },
          {
            state,
            stateAttrMap: VolumeSliderDataAttrs,
            ref: [forwardedRef, rootRef, wheelRef],
            props: [{ style: { ...cssVars, ...rootStyle } }, rootProps, elementProps],
          }
        )}
      </SliderProvider>
    );
  }
);

export namespace VolumeSliderRoot {
  export type Props = VolumeSliderRootProps;
  export type State = VolumeSliderCore.State;
}
