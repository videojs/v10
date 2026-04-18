import { isFunction, isObject } from '@videojs/utils/predicate';

import type {
  MediaBufferCapability,
  MediaErrorCapability,
  MediaFullscreenCapability,
  MediaPauseCapability,
  MediaPictureInPictureCapability,
  MediaPlaybackRateCapability,
  MediaRemotePlaybackCapability,
  MediaSeekCapability,
  MediaSourceCapability,
  MediaTextTrackCapability,
  MediaVolumeCapability,
} from './types';

export function isMediaPauseCapable(value: unknown): value is MediaPauseCapability {
  return isObject(value) && 'paused' in value && 'ended' in value && 'pause' in value && isFunction(value.pause);
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
    'load' in value &&
    isFunction(value.load)
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
  return isObject(value) && 'remote' in value && isObject(value.remote);
}

export function isMediaFullscreenCapable(value: unknown): value is MediaFullscreenCapability {
  return isObject(value) && 'requestFullscreen' in value && isFunction(value.requestFullscreen);
}

export function isMediaPictureInPictureCapable(value: unknown): value is MediaPictureInPictureCapability {
  return isObject(value) && 'requestPictureInPicture' in value && isFunction(value.requestPictureInPicture);
}
