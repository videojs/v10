import { isFunction, isObject } from '@videojs/utils/predicate';
import { isMediaRemotePlaybackCapable } from '../../core/media/predicate';
import type { Media, MediaRemotePlaybackCapability, MediaSourceCapability } from '../../core/media/types';
import type { HTMLAudioElementHost } from './audio-host';
import { AUDIO_ELEMENT_HOST_SYMBOL } from './audio-host';
import type { DashMedia } from './dash';
import { DASH_MEDIA_SYMBOL } from './dash';
import type { HlsMedia } from './hls';
import { HLS_MEDIA_SYMBOL } from './hls';
import type { HTMLMediaElementHost } from './media-host';
import { MEDIA_ELEMENT_HOST_SYMBOL } from './media-host';
import type { HTMLVideoElementHost } from './video-host';
import { VIDEO_ELEMENT_HOST_SYMBOL } from './video-host';

export {
  isMediaBufferCapable,
  isMediaErrorCapable,
  isMediaPauseCapable,
  isMediaPlaybackRateCapable,
  isMediaRemotePlaybackCapable,
  isMediaSeekCapable,
  isMediaSourceCapable,
  isMediaTextTrackCapable,
  isMediaVolumeCapable,
} from '../../core/media/predicate';

export function hasMetadata(media: MediaSourceCapability): boolean {
  return media.readyState >= 1;
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

// -- Host type guards --

export function isHTMLMediaElementHost(value: unknown): value is HTMLMediaElementHost<HTMLMediaElement, any> {
  return isObject(value) && MEDIA_ELEMENT_HOST_SYMBOL in value;
}

export function isHTMLVideoElementHost(value: unknown): value is HTMLVideoElementHost {
  return isObject(value) && VIDEO_ELEMENT_HOST_SYMBOL in value;
}

export function isHTMLAudioElementHost(value: unknown): value is HTMLAudioElementHost {
  return isObject(value) && AUDIO_ELEMENT_HOST_SYMBOL in value;
}

export function isHlsMedia(value: unknown): value is HlsMedia {
  return isObject(value) && HLS_MEDIA_SYMBOL in value;
}

export function isDashMedia(value: unknown): value is DashMedia {
  return isObject(value) && DASH_MEDIA_SYMBOL in value;
}

// -- Resolve helpers --

export function resolveMediaRemote(media: Media): MediaRemotePlaybackCapability['remote'] | null {
  if (isMediaRemotePlaybackCapable(media)) {
    return media.remote;
  }

  return null;
}

export function resolveHTMLMediaElement(media: Media): HTMLMediaElement | null {
  if (media instanceof HTMLMediaElement) return media;
  if (isHTMLMediaElementHost(media)) return media.target;
  return null;
}

export function resolveHTMLVideoElement(media: Media): HTMLVideoElement | null {
  if (media instanceof HTMLVideoElement) return media;
  if (isHTMLVideoElementHost(media)) return media.target;
  return null;
}

export function resolveHTMLAudioElement(media: Media): HTMLAudioElement | null {
  if (media instanceof HTMLAudioElement) return media;
  if (isHTMLAudioElementHost(media)) return media.target;
  return null;
}
