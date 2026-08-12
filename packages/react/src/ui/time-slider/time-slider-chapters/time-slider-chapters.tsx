'use client';

import {
  type SliderSegmentState,
  TimeSliderChapterCSSVars,
  TimeSliderChapterDataAttrs,
  type TimeSliderChapterRange,
  TimeSliderChaptersCore,
} from '@videojs/core';
import { getStateDataAttrs, selectBuffer, selectTextTrack, selectTime } from '@videojs/core/dom';
import { isFunction } from '@videojs/utils/predicate';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { forwardRef, useMemo, useState } from 'react';

import { usePlayer } from '../../../player/context';
import type { HTMLProps, UIComponentProps } from '../../../utils/types';
import { SliderSegments } from './slider-segments';

export type TimeSliderChapterState = TimeSliderChaptersCore.State;

export interface TimeSliderChaptersState {
  /** Normalized ranges spanning the slider domain. */
  chapters: readonly TimeSliderChapterRange[];
  /** Whether at least one authored chapter is available. */
  hasChapters: boolean;
}

export interface TimeSliderChaptersProps extends Omit<UIComponentProps<'div', TimeSliderChaptersState>, 'children'> {
  /** Slider track rendered until authored chapters are available. */
  children?: ReactNode;
  /** Render one consumer-owned subtree for every normalized chapter. */
  renderChapter: (props: Omit<HTMLProps<HTMLElement>, 'ref'>, state: TimeSliderChapterState) => ReactElement;
}

/** Renders normalized chapter ranges as consumer-owned light DOM. */
export const TimeSliderChapters = forwardRef<HTMLDivElement, TimeSliderChaptersProps>(
  function TimeSliderChapters(componentProps, ref) {
    const { children, renderChapter, className, style, render, ...props } = componentProps;
    const textTrack = usePlayer(selectTextTrack);
    const buffer = usePlayer(selectBuffer);
    const time = usePlayer(selectTime);
    const duration = time?.duration ?? 0;
    const [core] = useState(() => new TimeSliderChaptersCore());
    const { chapters, ranges, max, hasChapters } = useMemo(
      () => core.getRanges(textTrack?.chaptersCues ?? [], 0, duration),
      [core, textTrack?.chaptersCues, duration]
    );
    const bufferedEnd = buffer?.buffered.length ? buffer.buffered[buffer.buffered.length - 1]![1] : 0;
    const getChapterState = (segment: SliderSegmentState) => core.getState(segment, chapters, bufferedEnd);
    const state = useMemo(() => ({ chapters, hasChapters }), [chapters, hasChapters]);

    return (
      <SliderSegments
        ref={ref}
        {...props}
        className={isFunction(className) ? className(state) : className}
        style={isFunction(style) ? style(state) : style}
        render={isFunction(render) ? (renderProps) => render(renderProps, state) : render}
        ranges={ranges}
        min={0}
        max={max}
        renderSegment={(segmentProps, segment) => {
          const state = getChapterState(segment);
          const chapterProps = {
            ...segmentProps,
            ...getStateDataAttrs(state, TimeSliderChapterDataAttrs),
            style: {
              ...segmentProps.style,
              pointerEvents: state.cue ? undefined : 'none',
              [TimeSliderChapterCSSVars.buffer]: `${state.bufferPercent}%`,
            } as CSSProperties,
          };

          return renderChapter(chapterProps, state);
        }}
      >
        {hasChapters ? undefined : children}
      </SliderSegments>
    );
  }
);

export namespace TimeSliderChapters {
  export type Props = TimeSliderChaptersProps;
  export type State = TimeSliderChaptersState;
}
