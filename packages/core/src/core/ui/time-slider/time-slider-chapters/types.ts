import type { MediaTextCue } from '@videojs/media';
import type { SliderSegmentRange, SliderSegmentState } from '../../slider/slider-segments-core';

export interface TimeSliderChapterRange extends SliderSegmentRange {
  /** Authored chapter cue, or `null` for an uncovered interval. */
  cue: MediaTextCue | null;
}

export interface TimeSliderChapterState extends SliderSegmentState {
  /** Authored chapter cue, or `null` for an uncovered interval. */
  cue: MediaTextCue | null;
  /** Buffer from 0–100 relative to this chapter. */
  bufferPercent: number;
}
