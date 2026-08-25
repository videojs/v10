import { isFunction, isObject, isUndefined } from '@videojs/utils/predicate';

import { EMPTY_REMOTE, EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from './constants';
import type {
  MediaAudioTrackCapability,
  MediaBufferCapability,
  MediaContentDataCapability,
  MediaErrorCapability,
  MediaLiveCapability,
  MediaPauseCapability,
  MediaPictureInPictureCapability,
  MediaPlaybackRateCapability,
  MediaRemotePlaybackCapability,
  MediaSeekCapability,
  MediaSourceCapability,
  MediaStreamTypeCapability,
  MediaTextTrackCapability,
  MediaVideoDimensionsCapability,
  MediaVideoRenditionCapability,
  MediaVolumeCapability,
} from './types';

export function hasMetadata(media: MediaSourceCapability): boolean {
  return media.readyState >= 1;
}

export function isMediaPauseCapable<Value>(value: Value): value is Value & MediaPauseCapability {
  if (!isObject(value)) return false;
  return (
    'paused' in value &&
    !isUndefined(value.paused) &&
    'ended' in value &&
    !isUndefined(value.ended) &&
    'pause' in value &&
    isFunction(value.pause)
  );
}

export function isMediaSeekCapable<Value>(value: Value): value is Value & MediaSeekCapability {
  if (!isObject(value)) return false;
  return (
    'currentTime' in value &&
    !isUndefined(value.currentTime) &&
    'duration' in value &&
    !isUndefined(value.duration) &&
    'seeking' in value &&
    !isUndefined(value.seeking)
  );
}

export function isMediaSourceCapable<Value>(value: Value): value is Value & MediaSourceCapability {
  if (!isObject(value)) return false;
  return (
    'src' in value &&
    !isUndefined(value.src) &&
    'currentSrc' in value &&
    !isUndefined(value.currentSrc) &&
    'readyState' in value &&
    !isUndefined(value.readyState) &&
    'load' in value &&
    isFunction(value.load)
  );
}

export function isMediaVolumeCapable<Value>(value: Value): value is Value & MediaVolumeCapability {
  if (!isObject(value)) return false;
  return 'volume' in value && !isUndefined(value.volume) && 'muted' in value && !isUndefined(value.muted);
}

/**
 * Whether the media reports a mute at all, which is a narrower question than
 * `isMediaVolumeCapable`: an embed can take a mute command while offering no way
 * to set a level.
 */
export function isMediaMutedCapable<Value>(value: Value): value is Value & Pick<MediaVolumeCapability, 'muted'> {
  if (!isObject(value)) return false;
  return 'muted' in value && !isUndefined(value.muted);
}

export function isMediaPlaybackRateCapable<Value>(value: Value): value is Value & MediaPlaybackRateCapability {
  if (!isObject(value)) return false;
  return 'playbackRate' in value && !isUndefined(value.playbackRate);
}

/**
 * Only `requestPictureInPicture` is required. A native video element carries it
 * but leaves exiting to `document`, so demanding the pair would rule out the one
 * media that most certainly can.
 */
export function isMediaPictureInPictureCapable<Value>(value: Value): value is Value & MediaPictureInPictureCapability {
  if (!isObject(value)) return false;
  return 'requestPictureInPicture' in value && isFunction(value.requestPictureInPicture);
}

export function isMediaBufferCapable<Value>(value: Value): value is Value & MediaBufferCapability {
  if (!isObject(value)) return false;
  return (
    'buffered' in value &&
    !isUndefined(value.buffered) &&
    value.buffered !== EMPTY_TIME_RANGES &&
    'seekable' in value &&
    !isUndefined(value.seekable) &&
    value.seekable !== EMPTY_TIME_RANGES
  );
}

export function isMediaErrorCapable<Value>(value: Value): value is Value & MediaErrorCapability {
  if (!isObject(value)) return false;
  return 'error' in value && !isUndefined(value.error);
}

export function isMediaTextTrackCapable<Value>(value: Value): value is Value & MediaTextTrackCapability {
  if (!isObject(value)) return false;
  return 'textTracks' in value && !isUndefined(value.textTracks) && value.textTracks !== EMPTY_TEXT_TRACKS;
}

export function isMediaVideoRenditionCapable<Value>(value: Value): value is Value & MediaVideoRenditionCapability {
  if (!isObject(value)) return false;
  return 'videoRenditions' in value && !isUndefined(value.videoRenditions);
}

export function isMediaAudioTrackCapable<Value>(value: Value): value is Value & MediaAudioTrackCapability {
  if (!isObject(value)) return false;
  return 'audioTracks' in value && !isUndefined(value.audioTracks);
}

export function isMediaVideoDimensionsCapable<Value>(value: Value): value is Value & MediaVideoDimensionsCapability {
  if (!isObject(value)) return false;
  return (
    'videoWidth' in value && !isUndefined(value.videoWidth) && 'videoHeight' in value && !isUndefined(value.videoHeight)
  );
}

export function isMediaRemotePlaybackCapable<Value>(value: Value): value is Value & MediaRemotePlaybackCapability {
  if (!isObject(value)) return false;
  return 'remote' in value && isObject(value.remote) && value.remote !== EMPTY_REMOTE;
}

export function isMediaStreamTypeCapable<Value>(value: Value): value is Value & MediaStreamTypeCapability {
  if (!isObject(value)) return false;
  return 'streamType' in value && !isUndefined(value.streamType);
}

export function isMediaContentDataCapable<Value>(value: Value): value is Value & MediaContentDataCapability {
  if (!isObject(value)) return false;
  return 'contentData' in value && !isUndefined(value.contentData);
}

export function isMediaLiveCapable<Value>(value: Value): value is Value & MediaLiveCapability {
  if (!isObject(value)) return false;
  return (
    'liveEdgeStart' in value &&
    !isUndefined(value.liveEdgeStart) &&
    'targetLiveWindow' in value &&
    !isUndefined(value.targetLiveWindow)
  );
}

/** Framework-agnostic `NodeList`-like shape returned by `querySelectorAll`. */
export interface NodeListLike<Element> {
  readonly length: number;
  readonly [index: number]: Element;
  item(index: number): Element | null;
  [Symbol.iterator](): Iterator<Element>;
}

export function isQuerySelectorAllCapable<Value, Element = Value>(
  value: Value
): value is Value & { querySelectorAll: (selectors: string) => NodeListLike<Element> } {
  return isObject(value) && 'querySelectorAll' in value && isFunction(value.querySelectorAll);
}
