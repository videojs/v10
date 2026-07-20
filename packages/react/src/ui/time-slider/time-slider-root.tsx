'use client';

import { TimeSliderCore, TimeSliderDataAttrs } from '@videojs/core';
import { getTimeSliderCSSVars, logMissingFeature, selectBuffer, selectPlayback, selectTime } from '@videojs/core/dom';
import { resolveTranslation } from '@videojs/core/i18n';
import { formatTime } from '@videojs/utils/time';
import { forwardRef, useEffect, useState } from 'react';

import { useLocale, useTranslator } from '../../i18n/context';
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
      pauseOnDrag,
      ...elementProps
    } = componentProps;

    const time = usePlayer(selectTime);
    const buffer = usePlayer(selectBuffer);
    const playback = usePlayer(selectPlayback);
    const translator = useTranslator();
    const locale = useLocale();

    const [core] = useState(() => new TimeSliderCore());
    core.setProps({
      label,
      step,
      largeStep,
      orientation,
      disabled,
      thumbAlignment,
      pauseOnDrag,
      changeThrottle,
    });
    core.setFormatLocale(locale);

    // Keep a ref to the latest media state for callbacks that fire outside the render cycle.
    const mediaRef = useLatestRef(time && buffer ? { ...time, ...buffer } : null);
    const playbackRef = useLatestRef(playback);

    // Resume playback if the slider unmounts mid-drag — createSlider's destroy()
    // does not fire onDragEnd, so without this the player would stay paused.
    useEffect(() => {
      return () => core.endDrag(playbackRef.current);
    }, [core]);

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
      onDragStart: () => {
        core.startDrag(playbackRef.current);
        onDragStart?.();
      },
      onDragEnd: () => {
        core.endDrag(playbackRef.current);
        onDragEnd?.();
      },
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
          getAttrs: (sliderState) => {
            const attrs = core.getAttrs(sliderState as TimeSliderCore.State);
            return {
              ...attrs,
              'aria-label': resolveTranslation(translator, attrs['aria-label']),
              'aria-valuetext': resolveTranslation(
                translator,
                attrs['aria-valuetext'],
                core.getValueTextParams(sliderState as TimeSliderCore.State)
              ),
            };
          },
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
