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
  MediaVideoDimensionsCapability,
  MediaVolumeCapability,
} from '../../core/media/types';

export function hasMetadata(media: MediaSourceCapability): boolean {
  return media.readyState >= 1;
}

/**
 * Treat a property as present only when it resolves to a non-`undefined` value.
 * Unlike an `in` check, this lets a layer opt out of a capability by overriding
 * a getter to return `undefined`.
 */
function isDefined(value: object, key: string): boolean {
  return !isUndefined((value as Record<string, unknown>)[key]);
}

export function isMediaPauseCapable(value: unknown): value is MediaPauseCapability {
  return (
    isObject(value) &&
    isDefined(value, 'paused') &&
    isDefined(value, 'ended') &&
    isFunction((value as Record<string, unknown>).pause)
  );
}

export function isMediaSeekCapable(value: unknown): value is MediaSeekCapability {
  return (
    isObject(value) && isDefined(value, 'currentTime') && isDefined(value, 'duration') && isDefined(value, 'seeking')
  );
}

export function isMediaSourceCapable(value: unknown): value is MediaSourceCapability {
  return (
    isObject(value) &&
    isDefined(value, 'src') &&
    isDefined(value, 'currentSrc') &&
    isDefined(value, 'readyState') &&
    isFunction((value as Record<string, unknown>).load)
  );
}

export function isMediaVolumeCapable(value: unknown): value is MediaVolumeCapability {
  return isObject(value) && isDefined(value, 'volume') && isDefined(value, 'muted');
}

export function isMediaVideoDimensionsCapable(value: unknown): value is MediaVideoDimensionsCapability {
  return isObject(value) && isDefined(value, 'videoWidth') && isDefined(value, 'videoHeight');
}

export function isMediaPlaybackRateCapable(value: unknown): value is MediaPlaybackRateCapability {
  return isObject(value) && isDefined(value, 'playbackRate');
}

export function isMediaBufferCapable(value: unknown): value is MediaBufferCapability {
  return isObject(value) && isDefined(value, 'buffered') && isDefined(value, 'seekable');
}

export function isMediaErrorCapable(value: unknown): value is MediaErrorCapability {
  return isObject(value) && isDefined(value, 'error');
}

export function isMediaTextTrackCapable(value: unknown): value is MediaTextTrackCapability {
  return isObject(value) && isDefined(value, 'textTracks');
}

export function isMediaRemotePlaybackCapable(value: unknown): value is MediaRemotePlaybackCapability {
  return isObject(value) && isObject((value as Record<string, unknown>).remote);
}

export function isMediaStreamTypeCapable(value: unknown): value is MediaStreamTypeCapability {
  return isObject(value) && isDefined(value, 'streamType');
}

export function isMediaLiveCapable(value: unknown): value is MediaLiveCapability {
  return isObject(value) && isDefined(value, 'liveEdgeStart') && isDefined(value, 'targetLiveWindow');
}

export function isQuerySelectorAllCapable<T extends string>(
  value: unknown
): value is {
  querySelectorAll: (selectors: T) => NodeListOf<HTMLElementTagNameMap[Extract<T, keyof HTMLElementTagNameMap>]>;
} {
  return isObject(value) && isFunction((value as Record<string, unknown>).querySelectorAll);
}
