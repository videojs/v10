import type { RemotePlaybackLike, TextTrackListLike, TimeRangeLike } from './types';

/** A frozen, empty `TimeRanges`-like value for hosts with no ranges. */
export const EMPTY_TIME_RANGES: TimeRangeLike = Object.freeze({
  length: 0,
  start: () => 0,
  end: () => 0,
});

/** A frozen, empty `TextTrackList`-like value for hosts with no text tracks. */
const emptyTextTracks = Object.assign(new EventTarget(), {
  length: 0,
  *[Symbol.iterator]() {},
  getTrackById: () => null,
});

export const EMPTY_TEXT_TRACKS: TextTrackListLike =
  // SAFETY: The EventTarget supplies event methods and the assigned members supply the list contract.
  emptyTextTracks as typeof emptyTextTracks & TextTrackListLike;

export const EMPTY_REMOTE =
  // SAFETY: Hosts without remote playback never invoke the unsupported remote-specific members.
  new EventTarget() as EventTarget & RemotePlaybackLike;
