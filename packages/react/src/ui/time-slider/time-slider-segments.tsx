'use client';

import { forwardRef } from 'react';
import { useTextTrack } from '../../player/use-text-track';
import { SliderSegments, type SliderSegmentsProps } from '../slider/slider-segments';

export interface TimeSliderSegmentsProps extends Omit<SliderSegmentsProps, 'segments'> {}

/** Renders chapter cues from the player store as slider segments. */
export const TimeSliderSegments = forwardRef<SVGSVGElement, TimeSliderSegmentsProps>(
  function TimeSliderSegments(props, ref) {
    const cues = useTextTrack('chapters')?.cues ?? [];
    const segments = cues.map(({ startTime, endTime }) => ({ start: startTime, end: endTime }));

    return <SliderSegments ref={ref} segments={segments} {...props} />;
  }
);

export namespace TimeSliderSegments {
  export type Props = TimeSliderSegmentsProps;
  export type State = SliderSegments.State;
}
