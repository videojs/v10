import type { RemotePlaybackLike, TextTrackListLike, TimeRangeLike } from '../../core/media/types';

export const EMPTY_TIME_RANGES: TimeRangeLike = Object.freeze({
  length: 0,
  start: () => 0,
  end: () => 0,
});

export const EMPTY_TEXT_TRACKS: TextTrackListLike = Object.assign(new EventTarget(), {
  length: 0,
  *[Symbol.iterator]() {},
  getTrackById: () => null,
}) as unknown as TextTrackListLike;

export const EMPTY_REMOTE = new EventTarget() as unknown as RemotePlaybackLike;

export const EMPTY_CONFIG: Record<string, unknown> = Object.freeze({});
