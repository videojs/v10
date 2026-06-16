import { isFunction, isObject, isUndefined } from '@videojs/utils/predicate';

import type {
  MediaBufferCapability,
  MediaErrorCapability,
  MediaLiveCapability,
  MediaPauseCapability,
  MediaPlaybackRateCapability,
  MediaRemotePlaybackCapability,
  MediaSeekCapability,
  MediaSourceCapability,
  MediaStreamTypeCapability,
  MediaTextTrackCapability,
  MediaVideoRenditionCapability,
  MediaVolumeCapability,
} from '../../core/media/types';
import { EMPTY_REMOTE, EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from './constants';

export function hasMetadata(media: MediaSourceCapability): boolean {
  return media.readyState >= 1;
}

export function isMediaPauseCapable(value: unknown): value is MediaPauseCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return !isUndefined(media.paused) && !isUndefined(media.ended) && isFunction(media.pause);
}

export function isMediaSeekCapable(value: unknown): value is MediaSeekCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return !isUndefined(media.currentTime) && !isUndefined(media.duration) && !isUndefined(media.seeking);
}

export function isMediaSourceCapable(value: unknown): value is MediaSourceCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return (
    !isUndefined(media.src) &&
    !isUndefined(media.currentSrc) &&
    !isUndefined(media.readyState) &&
    isFunction(media.load)
  );
}

export function isMediaVolumeCapable(value: unknown): value is MediaVolumeCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return !isUndefined(media.volume) && !isUndefined(media.muted);
}

export function isMediaPlaybackRateCapable(value: unknown): value is MediaPlaybackRateCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return !isUndefined(media.playbackRate);
}

export function isMediaBufferCapable(value: unknown): value is MediaBufferCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return (
    !isUndefined(media.buffered) &&
    media.buffered !== EMPTY_TIME_RANGES &&
    !isUndefined(media.seekable) &&
    media.seekable !== EMPTY_TIME_RANGES
  );
}

export function isMediaErrorCapable(value: unknown): value is MediaErrorCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return !isUndefined(media.error);
}

export function isMediaTextTrackCapable(value: unknown): value is MediaTextTrackCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return !isUndefined(media.textTracks) && media.textTracks !== EMPTY_TEXT_TRACKS;
}

export function isMediaVideoRenditionCapable(value: unknown): value is MediaVideoRenditionCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return !isUndefined(media.videoRenditions);
}

export function isMediaRemotePlaybackCapable(value: unknown): value is MediaRemotePlaybackCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return isObject(media.remote) && media.remote !== EMPTY_REMOTE;
}

export function isMediaStreamTypeCapable(value: unknown): value is MediaStreamTypeCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return !isUndefined(media.streamType);
}

export function isMediaLiveCapable(value: unknown): value is MediaLiveCapability {
  if (!isObject(value)) return false;
  const media = value as Record<string, unknown>;
  return !isUndefined(media.liveEdgeStart) && !isUndefined(media.targetLiveWindow);
}

export function isQuerySelectorAllCapable<T extends string>(
  value: unknown
): value is {
  querySelectorAll: (selectors: T) => NodeListOf<HTMLElementTagNameMap[Extract<T, keyof HTMLElementTagNameMap>]>;
} {
  return (
    isObject(value) && 'querySelectorAll' in value && isFunction((value as Record<string, unknown>).querySelectorAll)
  );
}
