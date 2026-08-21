import { TimeSliderCore, TimeSliderDataAttrs } from '@videojs/core';
import { getTimeSliderCSSVars, selectBuffer, selectPlayback, selectTime } from '@videojs/core/dom';
import { translateText } from '@videojs/core/i18n';
import { formatTime } from '@videojs/utils/time';
import { forwardRef, useEffect, useMemo, useState } from 'react';

import { useLocale, useTranslator } from '../../i18n/context';
import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useCommittedRef } from '../../utils/use-committed-ref';
import { useIsomorphicLayoutEffect } from '../../utils/use-isomorphic-layout-effect';
import { renderElement } from '../../utils/use-render';
import { useLogMissingFeature } from '../hooks/use-log-missing-feature';
import { type SliderRenderState, useSlider } from '../hooks/use-slider';
import { SliderProvider } from '../slider/context';

const noopSeek = (): Promise<number> => Promise.resolve(0);

export interface TimeSliderRootProps
  extends UIComponentProps<'div', SliderRenderState<TimeSliderCore.State>>,
    TimeSliderCore.Props {
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

    const coreProps: TimeSliderCore.Props = useMemo(
      () => ({ label, step, largeStep, orientation, disabled, thumbAlignment, pauseOnDrag, changeThrottle }),
      [label, step, largeStep, orientation, disabled, thumbAlignment, pauseOnDrag, changeThrottle]
    );
    const core = new TimeSliderCore(coreProps);
    core.setFormatLocale(locale);

    // Drag pause/resume spans renders, so this is the only retained core. Its
    // configuration and cleanup input become visible only after commit.
    const [dragCore] = useState(() => new TimeSliderCore());
    const playbackRef = useCommittedRef(playback);
    useIsomorphicLayoutEffect(() => {
      dragCore.setProps(coreProps);
    }, [coreProps, dragCore]);

    // Resume playback if the slider unmounts mid-drag — createSlider's destroy()
    // does not fire onDragEnd, so without this the player would stay paused.
    // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup reads commit-published playback without reinstalling the effect
    useEffect(() => {
      return () => dragCore.endDrag(playbackRef.current);
    }, [dragCore]);

    const duration = time?.duration ?? 0;

    const { state, motion, cssVars, rootRef, thumbRef, rootProps, rootStyle, thumbProps } =
      useSlider<TimeSliderCore.State>({
        computeState: (input) => {
          core.setInput({ ...TimeSliderCore.defaultInput, ...input });
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
        getPercent: () => core.percentFromValue(time?.currentTime ?? 0),
        getStepPercent: () => core.getStepPercent(),
        getLargeStepPercent: () => core.getLargeStepPercent(),
        orientation,
        disabled,
        thumbAlignment,
        changeThrottle,
        adjustPercent: (rawPercent, thumbSize, trackSize) =>
          core.adjustPercentForAlignment(rawPercent, thumbSize, trackSize),
        getCSSVars: getTimeSliderCSSVars,
        onValueCommit: (percent) => {
          if (time) time.seek(core.rawValueFromPercent(percent));
        },
        onDragStart: () => {
          dragCore.startDrag(playback);
          onDragStart?.();
        },
        onDragEnd: () => {
          dragCore.endDrag(playback);
          onDragEnd?.();
        },
      });

    useLogMissingFeature(!time, 'TimeSlider', 'time');

    if (!time) return null;

    return (
      <SliderProvider
        value={{
          state,
          motion,
          getPointerValue: (percent) => core.rawValueFromPercent(percent),
          thumbRef,
          thumbProps,
          stateAttrMap: TimeSliderDataAttrs,
          getAttrs: (sliderState, sliderMotion) => {
            const liveState = {
              ...sliderState,
              pointerPercent: sliderMotion.pointerPercent,
            } as TimeSliderCore.State;
            const attrs = core.getAttrs(liveState);
            return {
              ...attrs,
              'aria-label': translateText(attrs['aria-label'], translator),
              'aria-valuetext': translateText(attrs['aria-valuetext'], translator, core.getValueTextParams(liveState)),
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
  export type State = SliderRenderState<TimeSliderCore.State>;
}
