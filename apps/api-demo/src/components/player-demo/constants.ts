import type { MediaFullEvents } from '@videojs/core';
import type { CuePoint } from '@videojs/core/dom/media/cue-points';

export const DEFAULT_SRC = 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008.m3u8';

// Default cue points, applied to the media through the `cuePoints` config
// namespace and readable back via the CuePoints component API.
export const DEFAULT_CUE_POINTS: CuePoint[] = [
  { time: 1, value: 'Simple Value' },
  { time: 3, value: { complex: 'Complex Object', duration: 2 } },
  { time: 10, value: true },
  { time: 15, value: { anything: 'That can be serialized to JSON and makes sense for your use case' } },
];

// The most common media events. `timeupdate` and `progress` fire continuously,
// so they are intentionally omitted to keep the log readable.
export const LOGGED_EVENTS = [
  'loadstart',
  'loadedmetadata',
  'loadeddata',
  'canplay',
  'canplaythrough',
  'play',
  'playing',
  'pause',
  'waiting',
  'seeking',
  'seeked',
  'ratechange',
  'volumechange',
  'durationchange',
  'ended',
  'error',
] as const satisfies readonly (keyof MediaFullEvents)[];

// Events that may change the values mirrored in the controls panel.
export const STATE_EVENTS = [
  'loadstart',
  'loadedmetadata',
  'emptied',
  'durationchange',
  'timeupdate',
  'play',
  'playing',
  'pause',
  'ended',
  'seeking',
  'seeked',
  'ratechange',
  'volumechange',
] as const satisfies readonly (keyof MediaFullEvents)[];
