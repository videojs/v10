'use client';

import { TimeSliderCore, TimeSliderDataAttrs } from '@videojs/core';
import { getTimeSliderCSSVars, logMissingFeature, selectBuffer, selectTime } from '@videojs/core/dom';
import { formatTime } from '@videojs/utils/time';
import { forwardRef, useRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useLatestRef } from '../../utils/use-latest-ref';
import { renderElement } from '../../utils/use-render';
import { useSlider } from '../hooks/use-slider';
import { SliderProvider } from '../slider/slider-context';

const noopSeek = (): Promise<number> => Promise.resolve(0);

export interface TimeSliderRootProps
  extends UIComponentProps<'div', TimeSliderCore.State>,
    Pick<TimeSliderCore.Props, 'label' | 'step' | 'largeStep' | 'disabled' | 'thumbAlignment'> {
  /** Trailing-edge throttle (ms) for seek requests during drag. Default `100`. `0` disables. */
  commitThrottle?: number | undefined;
  onDragStart?: (() => void) | undefined;
  onDragEnd?: (() => void) | undefined;
}

export const TimeSliderRoot = forwardRef<HTMLDivElement, TimeSliderRootProps>(
  function TimeSliderRoot(componentProps, forwardedRef) {
    const {
      render,
      className,
      style,
      label,
      step = 1,
      largeStep = 10,
      disabled,
      thumbAlignment,
      commitThrottle = 100,
      onDragStart,
      onDragEnd,
      ...elementProps
    } = componentProps;

    const time = usePlayer(selectTime);
    const buffer = usePlayer(selectBuffer);

    const [core] = useState(() => new TimeSliderCore());
    core.setProps({ label, step, largeStep, disabled, thumbAlignment });

    // Keep a ref to the latest media state for callbacks that fire outside the render cycle.
    const mediaRef = useLatestRef(time && buffer ? { ...time, ...buffer } : null);

    // Holds the target time (seconds) between commit and seek completion, preventing the slider
    // from snapping back to the stale `currentTime` while the async seek settles.
    const pendingSeekRef = useRef<number | null>(null);

    const duration = time?.duration ?? 0;
    const range = duration || 1;

    const { state, cssVars, rootRef, thumbRef, rootProps, thumbProps } = useSlider<TimeSliderCore.State>({
      computeState: (interaction) => {
        if (!time || !buffer) {
          return core.getTimeState(
            { currentTime: 0, duration: 0, seeking: false, seek: noopSeek, buffered: [], seekable: [] },
            interaction
          );
        }

        const baseState = core.getTimeState({ ...time, ...buffer }, interaction);

        // After drag release, `dragging` resets before the async seek completes. Hold the
        // slider at the committed position until `currentTime` catches up.
        const pending = pendingSeekRef.current;
        if (!interaction.dragging && pending !== null) {
          if (Math.abs(time.currentTime - pending) < 0.5) {
            // Seek landed — clear pending.
            pendingSeekRef.current = null;
          } else {
            const dur = time.duration || 1;
            const fillPercent = (pending / dur) * 100;
            return { ...baseState, value: pending, fillPercent };
          }
        }

        return baseState;
      },
      getPercent: () => (duration > 0 ? ((time?.currentTime ?? 0) / duration) * 100 : 0),
      getStepPercent: () => (step / range) * 100,
      getLargeStepPercent: () => (largeStep / range) * 100,
      orientation: 'horizontal',
      disabled,
      commitThrottle,
      adjustPercent: (rawPercent, thumbSize, trackSize) =>
        core.adjustPercentForAlignment(rawPercent, thumbSize, trackSize),
      getCSSVars: getTimeSliderCSSVars,
      onValueChange: (percent) => {
        // Track the target position for visual hold during pointer interaction.
        const media = mediaRef.current;
        if (media) {
          pendingSeekRef.current = (percent / 100) * (media.duration || 0);
        }
      },
      onValueCommit: (percent) => {
        const media = mediaRef.current;
        if (!media) return;
        const seconds = (percent / 100) * (media.duration || 0);
        pendingSeekRef.current = seconds;
        // seek() is async — catch rejection if the media target isn't attached yet.
        media.seek(seconds).catch(() => {
          pendingSeekRef.current = null;
        });
      },
      onDragStart,
      onDragEnd,
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
            props: [{ style: cssVars }, rootProps, elementProps],
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
