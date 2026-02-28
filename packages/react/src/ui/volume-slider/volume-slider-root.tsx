'use client';

import { SliderDataAttrs, VolumeSliderCore } from '@videojs/core';
import { getSliderCSSVars, logMissingFeature, selectVolume } from '@videojs/core/dom';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useLatestRef } from '../../utils/use-latest-ref';
import { renderElement } from '../../utils/use-render';
import { useSlider } from '../hooks/use-slider';
import { SliderProvider } from '../slider/slider-context';

const noopVolume = {
  volume: 0,
  muted: false,
  volumeAvailability: 'unsupported' as const,
  changeVolume: () => 0,
  toggleMute: () => false,
};

export interface VolumeSliderRootProps
  extends UIComponentProps<'div', VolumeSliderCore.State>,
    Pick<VolumeSliderCore.Props, 'label' | 'orientation' | 'step' | 'largeStep' | 'disabled' | 'thumbAlignment'> {
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
    const volumeRef = useLatestRef(volume);

    const { state, cssVars, rootRef, thumbRef, rootProps, thumbProps } = useSlider<VolumeSliderCore.State>({
      computeState: (interaction) => {
        if (!volume) {
          return core.getVolumeState(noopVolume, interaction);
        }
        return core.getVolumeState(volume, interaction);
      },
      getPercent: () => (volume ? volume.volume * 100 : 0),
      getStepPercent: () => step,
      getLargeStepPercent: () => largeStep,
      orientation,
      disabled,
      adjustPercent: (rawPercent, thumbSize, trackSize) =>
        core.adjustPercentForAlignment(rawPercent, thumbSize, trackSize),
      getCSSVars: getSliderCSSVars,
      onValueChange: (percent) => {
        volumeRef.current?.changeVolume(percent / 100);
      },
      onValueCommit: (percent) => {
        volumeRef.current?.changeVolume(percent / 100);
      },
      onDragStart,
      onDragEnd,
    });

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
          stateAttrMap: SliderDataAttrs,
          getAttrs: (sliderState) => core.getAttrs(sliderState as VolumeSliderCore.State),
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
  }
);

export namespace VolumeSliderRoot {
  export type Props = VolumeSliderRootProps;
  export type State = VolumeSliderCore.State;
}
