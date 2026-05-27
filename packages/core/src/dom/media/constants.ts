import type { RemotePlaybackLike, TimeRangeLike } from '../../core/media/types';

export const EMPTY_TIME_RANGES: TimeRangeLike = Object.freeze({ length: 0, start: () => 0, end: () => 0 });

export const EMPTY_REMOTE = new EventTarget() as unknown as RemotePlaybackLike;

export const EMPTY_CONFIG: Record<string, unknown> = Object.freeze({});

const EMPTY_MEDIA_LIST_PROPS = Object.freeze({
  length: 0,
});

export const EMPTY_MEDIA_LIST = Object.assign(new EventTarget(), EMPTY_MEDIA_LIST_PROPS);
