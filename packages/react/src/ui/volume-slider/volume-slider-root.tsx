'use client';

import { SliderDataAttrs, VolumeSliderCore } from '@videojs/core';
import { getSliderCSSVars, logMissingFeature, selectVolume } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useLatestRef } from '../../utils/use-latest-ref';
import { renderElement } from '../../utils/use-render';
import { useSlider } from '../hooks/use-slider';
import { SliderProvider } from '../slider/slider-context';

export interface VolumeSliderRootProps extends UIComponentProps<'div', VolumeSliderCore.State> {
  label?: string | undefined;
  orientation?: 'horizontal' | 'vertical' | undefined;
  step?: number | undefined;
  largeStep?: number | undefined;
  disabled?: boolean | undefined;
  thumbAlignment?: 'center' | 'edge' | undefined;
  onDragStart?: (() => void) | undefined;
  onDragEnd?: (() => void) | undefined;
}

export const VolumeSliderRoot = forwardRef(function VolumeSliderRoot(
  componentProps: VolumeSliderRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const {
    render,
    className,
    style,
    label,
    orientation,
    step = 1,
    largeStep = 10,
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
  const mediaRef = useLatestRef(volume);

  const { state, rootRef, thumbRef, rootElement, thumbElement, rootProps, thumbProps } =
    useSlider<VolumeSliderCore.State>({
      computeState: (interaction) => {
        if (!volume) {
          return core.getState(interaction, 0) as VolumeSliderCore.State;
        }
        return core.getVolumeState(volume, interaction);
      },
      getPercent: () => (volume ? volume.volume * 100 : 0),
      getStepPercent: () => step,
      getLargeStepPercent: () => largeStep,
      orientation,
      disabled,
      onValueChange: (percent) => {
        try {
          mediaRef.current?.changeVolume(percent / 100);
        } catch {
          // Silently ignore — media target may not be attached yet.
        }
      },
      onValueCommit: (percent) => {
        try {
          mediaRef.current?.changeVolume(percent / 100);
        } catch {
          // Silently ignore — media target may not be attached yet.
        }
      },
      onDragStart,
      onDragEnd,
    });

  if (!volume) {
    if (__DEV__) logMissingFeature('VolumeSlider', 'volume');
    return null;
  }

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
        thumbRef,
        thumbProps,
        stateAttrMap: SliderDataAttrs,
        getAttrs: (s) => core.getAttrs(s as VolumeSliderCore.State),
        formatValue: (value) => `${Math.round(value)}%`,
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

export namespace VolumeSliderRoot {
  export type Props = VolumeSliderRootProps;
  export type State = VolumeSliderCore.State;
}
