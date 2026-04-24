import { isFunction, isObject } from '@videojs/utils/predicate';

import type {
  MediaBufferCapability,
  MediaErrorCapability,
  MediaPauseCapability,
  MediaPictureInPictureCapability,
  MediaPlaybackRateCapability,
  MediaRemotePlaybackCapability,
  MediaSeekCapability,
  MediaSourceCapability,
  MediaStreamTypeCapability,
  MediaTextTrackCapability,
  MediaVolumeCapability,
} from '../../core/media/types';

export function hasMetadata(media: MediaSourceCapability): boolean {
  return media.readyState >= 1;
}

export function isMediaPauseCapable(value: unknown): value is MediaPauseCapability {
  return (
    isObject(value) && 'paused' in value && 'ended' in value && isFunction((value as Record<string, unknown>).pause)
  );
}

export function isMediaSeekCapable(value: unknown): value is MediaSeekCapability {
  return isObject(value) && 'currentTime' in value && 'duration' in value && 'seeking' in value;
}

export function isMediaSourceCapable(value: unknown): value is MediaSourceCapability {
  return (
    isObject(value) &&
    'src' in value &&
    'currentSrc' in value &&
    'readyState' in value &&
    isFunction((value as Record<string, unknown>).load)
  );
}

export function isMediaVolumeCapable(value: unknown): value is MediaVolumeCapability {
  return isObject(value) && 'volume' in value && 'muted' in value;
}

export function isMediaPlaybackRateCapable(value: unknown): value is MediaPlaybackRateCapability {
  return isObject(value) && 'playbackRate' in value;
}

export function isMediaBufferCapable(value: unknown): value is MediaBufferCapability {
  return isObject(value) && 'buffered' in value && 'seekable' in value;
}

export function isMediaErrorCapable(value: unknown): value is MediaErrorCapability {
  return isObject(value) && 'error' in value;
}

export function isMediaTextTrackCapable(value: unknown): value is MediaTextTrackCapability {
  return isObject(value) && 'textTracks' in value;
}

export function isMediaRemotePlaybackCapable(value: unknown): value is MediaRemotePlaybackCapability {
  return isObject(value) && 'remote' in value && isObject((value as Record<string, unknown>).remote);
}

export function isMediaPictureInPictureCapable(value: unknown): value is MediaPictureInPictureCapability {
  return isObject(value) && 'isPictureInPicture' in value;
}

export function isMediaStreamTypeCapable(value: unknown): value is MediaStreamTypeCapability {
  return isObject(value) && 'streamType' in value;
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
