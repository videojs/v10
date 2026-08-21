import { VolumeSliderCore, VolumeSliderDataAttrs } from '@videojs/core';
import { createWheelStep, getSliderCSSVars, selectVolume } from '@videojs/core/dom';
import { translateText } from '@videojs/core/i18n';
import { listen } from '@videojs/utils/dom';
import { forwardRef, useRef } from 'react';

import { useLocale, useTranslator } from '../../i18n/context';
import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useLogMissingFeature } from '../hooks/use-log-missing-feature';
import { type SliderRenderState, useSlider } from '../hooks/use-slider';
import { SliderProvider } from '../slider/context';

const noopVolume = {
  volume: 0,
  muted: false,
  volumeAvailability: 'unsupported' as const,
  mutedAvailability: 'unsupported' as const,
  setVolume: () => 0,
  toggleMuted: () => false,
};

export interface VolumeSliderRootProps
  extends UIComponentProps<'div', SliderRenderState<VolumeSliderCore.State>>,
    VolumeSliderCore.Props {
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
      wheelStep = VolumeSliderCore.defaultProps.wheelStep,
      disabled,
      thumbAlignment,
      onDragStart,
      onDragEnd,
      ...elementProps
    } = componentProps;

    const volume = usePlayer(selectVolume);
    const translator = useTranslator();
    const locale = useLocale();
    const isUnavailable = volume?.volumeAvailability !== 'available';
    const isDisabled = Boolean(disabled) || isUnavailable;

    const core = new VolumeSliderCore({ label, orientation, step, largeStep, wheelStep, disabled, thumbAlignment });
    core.setFormatLocale(locale);

    const getPercent = () => (volume?.volume ?? 0) * 100;
    const getStepPercent = () => core.getStepPercent();
    const setVolume = (percent: number) => volume?.setVolume(percent / 100);

    const { state, motion, cssVars, rootRef, thumbRef, rootProps, rootStyle, thumbProps } =
      useSlider<VolumeSliderCore.State>({
        computeState: (input) => {
          core.setInput({ ...VolumeSliderCore.defaultInput, ...input });
          core.setMedia(volume ?? noopVolume);
          const state = core.getState();
          const value = state.volume * 100;

          // Core and HTML retain transient drag values. React render state
          // reflects the observed media value; live drag position is motion.
          return {
            ...state,
            value,
            fillPercent: state.muted ? 0 : core.percentFromValue(value),
          };
        },
        getPercent,
        getStepPercent,
        getLargeStepPercent: () => core.getLargeStepPercent(),
        orientation,
        disabled: isDisabled,
        thumbAlignment,
        adjustPercent: (rawPercent, thumbSize, trackSize) =>
          core.adjustPercentForAlignment(rawPercent, thumbSize, trackSize),
        getCSSVars: getSliderCSSVars,
        onValueChange: setVolume,
        onValueCommit: setVolume,
        onDragStart,
        onDragEnd,
      });

    const wheelHandler = createWheelStep({
      isDisabled: () => isDisabled,
      getPercent,
      getStepPercent: () => core.getWheelStepPercent(),
      onValueChange: setVolume,
    });

    // Attach non-passive wheel listener via callback ref so it covers
    // late-mounted elements (null → mounted after volume appears).
    const wheelCleanupRef = useRef<(() => void) | null>(null);
    const wheelRef = (element: HTMLDivElement | null) => {
      wheelCleanupRef.current?.();
      wheelCleanupRef.current = null;
      if (element) {
        wheelCleanupRef.current = listen(element, 'wheel', wheelHandler.onWheel, { passive: false });
      }
    };

    useLogMissingFeature(!volume, 'VolumeSlider', 'volume');

    if (!volume) return null;

    if (state.hidden) return null;

    return (
      <SliderProvider
        value={{
          state,
          motion,
          getPointerValue: (percent) => core.valueFromPercent(percent),
          thumbRef,
          thumbProps,
          stateAttrMap: VolumeSliderDataAttrs,
          getAttrs: (sliderState, sliderMotion) => {
            const liveState = {
              ...sliderState,
              pointerPercent: sliderMotion.pointerPercent,
              value: sliderState.dragging ? sliderMotion.pointerValue : sliderState.value,
            } as VolumeSliderCore.State;
            const attrs = core.getAttrs(liveState);
            return {
              ...attrs,
              'aria-label': translateText(attrs['aria-label'], translator),
              'aria-valuetext': translateText(attrs['aria-valuetext'], translator, core.getValueTextParams(liveState)),
            };
          },
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
  export type State = SliderRenderState<VolumeSliderCore.State>;
}
