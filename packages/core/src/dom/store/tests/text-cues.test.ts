import type { TextCueLike, TextCueListLike } from '@videojs/media';
import { describe, expect, it } from 'vite-plus/test';

import { clampCuesToDuration } from '../text-cues';

function cueList(...cues: TextCueLike[]): TextCueListLike {
  return { length: cues.length, [Symbol.iterator]: () => cues[Symbol.iterator]() };
}

// A chapters document delivered with the stream leaves its last chapter open;
// the track carries that as a very large end.
const open = () =>
  cueList(
    { startTime: 0, endTime: 3, text: 'Intro' },
    { startTime: 3, endTime: Number.MAX_SAFE_INTEGER, text: 'Outro' }
  );

describe('clampCuesToDuration', () => {
  it('returns an empty list for a missing cue list', () => {
    expect(clampCuesToDuration(null, 10)).toEqual([]);
    expect(clampCuesToDuration(undefined, 10)).toEqual([]);
  });

  it('clamps every cue end to a finite duration', () => {
    expect(clampCuesToDuration(open(), 23.872)).toEqual([
      { startTime: 0, endTime: 3, text: 'Intro' },
      { startTime: 3, endTime: 23.872, text: 'Outro' },
    ]);
  });

  it('passes ends through while the duration is unknown, infinite, or zero', () => {
    for (const duration of [Number.NaN, Number.POSITIVE_INFINITY, 0]) {
      expect(clampCuesToDuration(open(), duration)[1]?.endTime).toBe(Number.MAX_SAFE_INTEGER);
    }
  });

  it('returns plain data, not the live cues, with a missing text read as empty', () => {
    const live: TextCueLike = { startTime: 0, endTime: 5 };
    const [normalized] = clampCuesToDuration(cueList(live), 10);

    expect(normalized).not.toBe(live);
    expect(normalized).toEqual({ startTime: 0, endTime: 5, text: '' });
  });
});
