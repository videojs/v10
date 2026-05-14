'use client';

import { TimeSliderCore, TimeSliderDataAttrs } from '@videojs/core';
import { getTimeSliderCSSVars, logMissingFeature, selectBuffer, selectPlayback, selectTime } from '@videojs/core/dom';
import { formatTime } from '@videojs/utils/time';
import { forwardRef, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useLatestRef } from '../../utils/use-latest-ref';
import { renderElement } from '../../utils/use-render';
import { useSlider } from '../hooks/use-slider';
import { SliderProvider } from '../slider/context';

const noopSeek = (): Promise<number> => Promise.resolve(0);

export interface TimeSliderRootProps extends UIComponentProps<'div', TimeSliderCore.State>, TimeSliderCore.Props {
  onDragStart?: (() => void) | undefined;
  onDragEnd?: (() => void) | undefined;
  /**
   * When true, pause playback while the user is dragging the thumb,
   * resuming on release if it was playing before. Default `false`.
   */
  pauseWhileDragging?: boolean | undefined;
}

export const TimeSliderRoot = forwardRef<HTMLDivElement, TimeSliderRootProps>(
  function TimeSliderRoot(componentProps, forwardedRef) {
    const {
      render,
      className,
      style,
      label,
      changeThrottle = TimeSliderCore.defaultProps.changeThrottle,
      step = TimeSliderCore.defaultProps.step,
      largeStep = TimeSliderCore.defaultProps.largeStep,
      orientation,
      disabled,
      thumbAlignment,
      onDragStart,
      onDragEnd,
      pauseWhileDragging = false,
      ...elementProps
    } = componentProps;

    const time = usePlayer(selectTime);
    const buffer = usePlayer(selectBuffer);
    const playback = usePlayer(selectPlayback);

    const [core] = useState(() => new TimeSliderCore());
    core.setProps({ label, step, largeStep, orientation, disabled, thumbAlignment });

    // Keep a ref to the latest media state for callbacks that fire outside the render cycle.
    const mediaRef = useLatestRef(time && buffer ? { ...time, ...buffer } : null);
    const playbackRef = useLatestRef(playback);
    const wasPlayingRef = useRef(false);

    const handleDragStart = () => {
      wasPlayingRef.current = false;
      const playback = playbackRef.current;
      if (pauseWhileDragging && playback && !playback.paused) {
        wasPlayingRef.current = true;
        playback.pause();
      }
      onDragStart?.();
    };

    const handleDragEnd = () => {
      if (pauseWhileDragging && wasPlayingRef.current) {
        playbackRef.current?.play().catch(() => {
          // Resume play() can reject (autoplay policy, etc.) — surface via existing error feature.
        });
      }
      wasPlayingRef.current = false;
      onDragEnd?.();
    };

    const duration = time?.duration ?? 0;

    const { state, cssVars, rootRef, thumbRef, rootProps, rootStyle, thumbProps } = useSlider<TimeSliderCore.State>({
      computeState: (input) => {
        core.setInput(input);
        if (!time || !buffer) {
          core.setMedia({
            currentTime: 0,
            duration: 0,
            seeking: false,
            seek: noopSeek,
            buffered: [],
            seekable: [],
          });
        } else {
          core.setMedia({ ...time, ...buffer });
        }

        return core.getState();
      },
      getPercent: () => (duration > 0 ? ((time?.currentTime ?? 0) / duration) * 100 : 0),
      getStepPercent: () => core.getStepPercent(),
      getLargeStepPercent: () => core.getLargeStepPercent(),
      orientation,
      disabled,
      changeThrottle,
      adjustPercent: (rawPercent, thumbSize, trackSize) =>
        core.adjustPercentForAlignment(rawPercent, thumbSize, trackSize),
      getCSSVars: getTimeSliderCSSVars,
      onValueCommit: (percent) => {
        const media = mediaRef.current;
        if (media) media.seek(core.rawValueFromPercent(percent));
      },
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    });

    if (!time) {
      if (__DEV__) logMissingFeature('TimeSlider', 'time');
      return null;
    }

    return (
      <SliderProvider
        value={{
          state,
          pointerValue: core.valueFromPercent(state.pointerPercent),
          thumbRef,
          thumbProps,
          stateAttrMap: TimeSliderDataAttrs,
          getAttrs: (sliderState) => core.getAttrs(sliderState as TimeSliderCore.State),
          formatValue: (value) => formatTime(value, duration),
        }}
      >
        {renderElement(
          'div',
          { render, className, style },
          {
            state,
            stateAttrMap: TimeSliderDataAttrs,
            ref: [forwardedRef, rootRef],
            props: [{ style: { ...cssVars, ...rootStyle } }, rootProps, elementProps],
          }
        )}
      </SliderProvider>
    );
  }
);

export namespace TimeSliderRoot {
  export type Props = TimeSliderRootProps;
  export type State = TimeSliderCore.State;
}
