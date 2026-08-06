import type { MediaTextCue } from '@videojs/media';
import { findTimelineEntry } from '../utils/find-timeline-entry';

export interface SliderChapterState {
  /** Title of the chapter at the slider pointer position. */
  title: string;
}

export class SliderChapterCore {
  getState(cues: readonly MediaTextCue[], time: number): SliderChapterState {
    const cue = findTimelineEntry(cues, time);
    const lastCue = cues[cues.length - 1];
    const active = cue && (time < cue.endTime || (cue === lastCue && time === cue.endTime));

    return { title: active ? cue.text : '' };
  }
}

export namespace SliderChapterCore {
  export type State = SliderChapterState;
}
