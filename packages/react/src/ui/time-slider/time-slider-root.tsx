import { TimeSliderCore, TimeSliderDataAttrs } from '@videojs/core';
import { getTimeSliderCSSVars, selectBuffer, selectPlayback, selectTime } from '@videojs/core/dom';
import { translateText } from '@videojs/core/i18n';
import { formatTime } from '@videojs/utils/time';
import { forwardRef, useEffect, useLayoutEffect, useState } from 'react';

import { useLocale, useTranslator } from '../../i18n/context';
import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useCommittedRef } from '../../utils/use-committed-ref';
import { renderElement } from '../../utils/use-render';
import { useLogMissingFeature } from '../hooks/use-log-missing-feature';
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

    // Project this render's props and media. The core is render-local, so the retained slider only ever sees the
    // committed one.
    const core = new TimeSliderCore({
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

    const media = time && buffer ? { ...time, ...buffer } : null;
    const playbackRef = useCommittedRef(playback);

    // Whether a drag paused playback must outlive renders, so it lives on a retained core whose only input,
    // `pauseOnDrag`, is committed from a layout effect instead of being written during render.
    const [dragCore] = useState(() => new TimeSliderCore());

    useLayoutEffect(() => {
      dragCore.setProps({ pauseOnDrag });
    }, [dragCore, pauseOnDrag]);

    // Resume playback if the slider unmounts mid-drag — createSlider's destroy()
    // does not fire onDragEnd, so without this the player would stay paused.
    useEffect(() => {
      return () => dragCore.endDrag(playbackRef.current);
    }, [dragCore, playbackRef]);

    const duration = time?.duration ?? 0;

    const { state, input, cssVars, rootRef, thumbRef, rootProps, rootStyle, thumbProps } =
      useSlider<TimeSliderCore.State>({
        computeState: (input) => {
          core.setInput(input);

          if (!media) {
            core.setMedia({
              currentTime: 0,
              duration: 0,
              seeking: false,
              seek: noopSeek,
              buffered: [],
              seekable: [],
            });
          } else {
            core.setMedia(media);
          }

          return core.getState();
        },
        getPercent: () => core.percentFromValue(time?.currentTime ?? 0),
        getStepPercent: () => core.getStepPercent(),
        getLargeStepPercent: () => core.getLargeStepPercent(),
        orientation,
        disabled,
        changeThrottle,
        adjustPercent: (rawPercent, thumbSize, trackSize) =>
          core.adjustPercentForAlignment(rawPercent, thumbSize, trackSize),
        getCSSVars: getTimeSliderCSSVars,
        onValueCommit: (percent) => {
          if (media) media.seek(core.rawValueFromPercent(percent));
        },
        onDragStart: () => {
          dragCore.startDrag(playbackRef.current);
          onDragStart?.();
        },
        onDragEnd: () => {
          dragCore.endDrag(playbackRef.current);
          onDragEnd?.();
        },
      });

    useLogMissingFeature(!time, 'TimeSlider', 'time');

    if (!time) return null;

    return (
      <SliderProvider
        value={{
          state,
          pointerValue: core.rawValueFromPercent(state.pointerPercent),
          input,
          getPointerValue: (percent) => core.rawValueFromPercent(percent),
          thumbRef,
          thumbProps,
          stateAttrMap: TimeSliderDataAttrs,
          getAttrs: (sliderState) => {
            const attrs = core.getAttrs(sliderState as TimeSliderCore.State);

            return {
              ...attrs,
              'aria-label': translateText(attrs['aria-label'], translator),
              'aria-valuetext': translateText(
                attrs['aria-valuetext'],
                translator,
                core.getValueTextParams(sliderState as TimeSliderCore.State)
              ),
            };
          },
          formatValue: (value) => formatTime(value, duration, { locale }),
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
