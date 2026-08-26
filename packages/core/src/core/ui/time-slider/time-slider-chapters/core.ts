import type { MediaTextCue } from '@videojs/media';
import { findRangeAt } from '@videojs/utils/array';
import { toPercent } from '@videojs/utils/number';

import type { SliderSegmentRange, SliderSegmentState } from '../../slider/segments-core';
import type { TimeSliderChapterRange, TimeSliderChapterState } from './types';

const cueKeys = new WeakMap<object, string>();
let cueKey = 0;

function getCueKey(cue: MediaTextCue): string {
  let key = cueKeys.get(cue);

  if (!key) {
    const id = (cue as MediaTextCue & { id?: unknown }).id;

    key = `cue-${typeof id === 'string' && id ? `${id}-` : ''}${cueKey++}`;
    cueKeys.set(cue, key);
  }

  return key;
}

/** Produces an ordered, non-overlapping, contiguous partition of the slider domain. */
export function normalizeChapterCues(
  cues: readonly MediaTextCue[],
  min: number,
  max: number
): TimeSliderChapterRange[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];

  const sorted = cues
    .map((cue, index) => ({ cue, index, key: getCueKey(cue) }))
    .filter(({ cue }) => Number.isFinite(cue.startTime) && Number.isFinite(cue.endTime))
    .sort((a, b) => a.cue.startTime - b.cue.startTime || a.index - b.index);

  const chapters: TimeSliderChapterRange[] = [];
  let end = min;
  let previousKey = 'start';

  for (const { cue, key } of sorted) {
    const start = Math.max(min, cue.startTime);
    const cueEnd = Math.min(max, cue.endTime);
    if (cueEnd <= start) continue;

    if (start > end) {
      chapters.push({ key: `gap-${previousKey}-${key}`, start: end, end: start, cue: null });
    }

    const segmentStart = Math.max(start, end);
    if (cueEnd <= segmentStart) continue;

    chapters.push({ key, start: segmentStart, end: cueEnd, cue });
    end = cueEnd;
    previousKey = key;
  }

  if (chapters.length === 0) return [{ key: 'gap-start-end', start: min, end: max, cue: null }];

  if (end < max) chapters.push({ key: `gap-${previousKey}-end`, start: end, end: max, cue: null });

  return chapters;
}

/** Prepares chapter ranges and state for platform renderers. */
export class TimeSliderChaptersCore {
  #cues: readonly MediaTextCue[] | null = null;
  #min = 0;
  #max = 0;
  #result: ReturnType<TimeSliderChaptersCore['getRanges']> | null = null;

  getRanges(
    cues: readonly MediaTextCue[],
    min: number,
    max: number
  ): {
    chapters: TimeSliderChapterRange[];
    ranges: SliderSegmentRange[];
    max: number;
  } {
    if (
      this.#result &&
      (this.#cues === cues || (this.#cues?.length === 0 && cues.length === 0)) &&
      this.#min === min &&
      this.#max === max
    ) {
      return this.#result;
    }

    const hasRange = max > min;
    const rangeMax = hasRange ? max : min + 1;
    const chapters = normalizeChapterCues(hasRange ? cues : [], min, rangeMax);
    const ranges = chapters.map(({ key, start, end, cue }) => ({ key, start, end, highlight: cue !== null }));

    this.#cues = cues;
    this.#min = min;
    this.#max = max;
    this.#result = { chapters, ranges, max: rangeMax };
    return this.#result;
  }

  findChapter(chapters: readonly TimeSliderChapterRange[], value: number): TimeSliderChapterRange | undefined {
    return findRangeAt(
      chapters,
      value,
      (chapter) => chapter.start,
      (chapter) => chapter.end
    );
  }

  getState(
    segment: SliderSegmentState,
    chapters: readonly TimeSliderChapterRange[],
    bufferedEnd: number
  ): TimeSliderChapterState {
    return {
      ...segment,
      cue: chapters[segment.index]?.cue ?? null,
      bufferPercent: toPercent(bufferedEnd, segment.start, segment.end),
    };
  }
}

export namespace TimeSliderChaptersCore {
  export type State = TimeSliderChapterState;
}
