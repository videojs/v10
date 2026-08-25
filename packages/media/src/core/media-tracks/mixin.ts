import { hasMethods } from '@videojs/utils/predicate';
import type { AnyConstructor, MixinReturn } from '@videojs/utils/types';

import type {
  MediaAudioRenditionCapability,
  MediaAudioTrackCapability,
  MediaVideoRenditionCapability,
  MediaVideoTrackCapability,
} from '../types';
import { AudioRenditionList } from './audio-rendition-list';
import { AudioTrack } from './audio-track';
import { AudioTrackList, addAudioTrack, removeAudioTrack } from './audio-track-list';
import type { TrackEvent } from './change-event';
import './global';
import { getPrivate } from './utils';
import { VideoRenditionList } from './video-rendition-list';
import { VideoTrack } from './video-track';
import { addVideoTrack, removeVideoTrack, VideoTrackList } from './video-track-list';

interface MediaTracksHost {
  readonly constructor: Function;
}

interface MediaTracksPrototype extends MediaTracksHost {
  addVideoTrack?: (kind: string, label?: string, language?: string) => VideoTrack;
  removeVideoTrack?: typeof removeVideoTrack;
  addAudioTrack?: (kind: string, label?: string, language?: string) => AudioTrack;
  removeAudioTrack?: typeof removeAudioTrack;
  detach?: (this: MediaTracksHost) => void;
}

export type WithMediaTracks<Base extends AnyConstructor<any>> = MixinReturn<
  Base,
  MediaVideoTrackCapability &
    MediaAudioTrackCapability &
    MediaVideoRenditionCapability &
    MediaAudioRenditionCapability & { detach(): void }
>;

const HTMLMediaElementConstructor =
  /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
    globalThis as { HTMLMediaElement?: AnyConstructor<HTMLMediaElement> }
  ).HTMLMediaElement;
const nativeVideoTracksFn = getBaseMediaTracksFn(HTMLMediaElementConstructor, 'video');
const nativeAudioTracksFn = getBaseMediaTracksFn(HTMLMediaElementConstructor, 'audio');

// Safari supports native media tracks, but native implementations cannot
// reliably represent manifest-derived MSE tracks or manually-added tracks.
export function MediaTracksMixin<Base extends AnyConstructor<any>>(MediaElementClass: Base): WithMediaTracks<Base> {
  if (!MediaElementClass?.prototype)
    return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ MediaElementClass as WithMediaTracks<Base>;

  // SAFETY: The mixin only installs the explicitly declared media-track methods on this prototype.
  const prototype = MediaElementClass.prototype as MediaTracksPrototype;
  const videoTracksFn = getBaseMediaTracksFn(MediaElementClass, 'video');

  if (!videoTracksFn || `${videoTracksFn}`.includes('[native code]')) {
    Object.defineProperty(prototype, 'videoTracks', {
      get() {
        return getVideoTracks(this);
      },
    });
  }

  const audioTracksFn = getBaseMediaTracksFn(MediaElementClass, 'audio');

  if (!audioTracksFn || `${audioTracksFn}`.includes('[native code]')) {
    Object.defineProperty(prototype, 'audioTracks', {
      get() {
        return getAudioTracks(this);
      },
    });
  }

  if (!hasOwn(prototype, 'addVideoTrack')) {
    prototype.addVideoTrack = function (this: HTMLMediaElement, kind: string, label = '', language = '') {
      const track = new VideoTrack();
      track.kind = kind;
      track.label = label;
      track.language = language;
      addVideoTrack(this, track);
      return track;
    };
  }

  if (!hasOwn(prototype, 'removeVideoTrack')) {
    prototype.removeVideoTrack = removeVideoTrack;
  }

  if (!hasOwn(prototype, 'addAudioTrack')) {
    prototype.addAudioTrack = function (this: HTMLMediaElement, kind: string, label = '', language = '') {
      const track = new AudioTrack();
      track.kind = kind;
      track.label = label;
      track.language = language;
      addAudioTrack(this, track);
      return track;
    };
  }

  if (!hasOwn(prototype, 'removeAudioTrack')) {
    prototype.removeAudioTrack = removeAudioTrack;
  }

  // Tear down the native-track listeners wired in getVideoTracks/getAudioTracks
  // when the target is removed, and drop the cached lists so a re-attach
  // re-mirrors against the new target.
  if (!hasOwn(prototype, 'detach')) {
    const baseDetach =
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ prototype.detach as
        | ((this: MediaTracksHost) => void)
        | undefined;
    prototype.detach = function (this: MediaTracksHost) {
      const priv = getPrivate(this);
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
        priv.videoTracksCleanup as AbortController | undefined
      )?.abort();
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
        priv.audioTracksCleanup as AbortController | undefined
      )?.abort();
      delete priv.videoTracks;
      delete priv.audioTracks;
      delete priv.videoTracksCleanup;
      delete priv.audioTracksCleanup;
      baseDetach?.call(this);
    };
  }

  if (!hasOwn(prototype, 'videoRenditions')) {
    Object.defineProperty(prototype, 'videoRenditions', {
      get() {
        return initVideoRenditions(this);
      },
    });
  }

  if (!hasOwn(prototype, 'audioRenditions')) {
    Object.defineProperty(prototype, 'audioRenditions', {
      get() {
        return initAudioRenditions(this);
      },
    });
  }

  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ MediaElementClass as WithMediaTracks<Base>;
}

function hasOwn(value: MediaTracksHost, key: PropertyKey) {
  return Object.hasOwn(value, key);
}

function initVideoRenditions(media: HTMLMediaElement) {
  let renditions =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ getPrivate(media)
      .videoRenditions as VideoRenditionList | undefined;
  if (!renditions) {
    renditions = new VideoRenditionList();
    getPrivate(renditions).media = new WeakRef(media);
    getPrivate(media).videoRenditions = renditions;
  }
  return renditions;
}

function initAudioRenditions(media: HTMLMediaElement) {
  let renditions =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ getPrivate(media)
      .audioRenditions as AudioRenditionList | undefined;
  if (!renditions) {
    renditions = new AudioRenditionList();
    getPrivate(renditions).media = new WeakRef(media);
    getPrivate(media).audioRenditions = renditions;
  }
  return renditions;
}

function getBaseMediaTracksFn(MediaElementClass: any, type: string): (() => any) | undefined {
  if (MediaElementClass?.prototype) {
    return Object.getOwnPropertyDescriptor(MediaElementClass.prototype, `${type}Tracks`)?.get;
  }
  return undefined;
}

// Native track lists are event targets wherever they are implemented (Safari).
// Environments that stub them out as plain arrays (jsdom) publish no changes, so
// there is nothing to mirror and the list stays local.
interface NativeTrackList extends Iterable<object> {
  addEventListener: EventTarget['addEventListener'];
  removeEventListener: EventTarget['removeEventListener'];
}

function isNativeTrackList<Value>(value: Value): value is Value & NativeTrackList {
  return (
    hasMethods(value, ['addEventListener', 'removeEventListener']) &&
    Symbol.iterator in value &&
    typeof value[Symbol.iterator] === 'function'
  );
}

function getVideoTracks(media: any) {
  let tracks = /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ getPrivate(
    media
  ).videoTracks as VideoTrackList | undefined;
  if (!tracks) {
    tracks = new VideoTrackList();
    getPrivate(media).videoTracks = tracks;

    const nativeEl = media.target;
    const nativeTracks = nativeVideoTracksFn && nativeEl ? nativeVideoTracksFn.call(nativeEl) : undefined;

    if (isNativeTrackList(nativeTracks)) {
      const currentTracks = tracks;

      for (const nativeTrack of nativeTracks) {
        addVideoTrack(media, nativeTrack);
      }

      const onChange = () => {
        currentTracks.dispatchEvent(new Event('change'));
      };

      const onAddTrack = (event: TrackEvent) => {
        if ([...currentTracks].some((track) => track instanceof VideoTrack)) return;
        addVideoTrack(
          media,
          /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ event.track as VideoTrack
        );
      };

      const onRemoveTrack = (event: TrackEvent) => {
        removeVideoTrack(
          /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ event.track as VideoTrack
        );
      };

      // Adding a custom track replaces any mirrored native tracks.
      const onCustomAddTrack = (event: Event) => {
        if (
          !(
            /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
              (event as TrackEvent).track instanceof VideoTrack
            )
          )
        )
          return;
        for (const nativeTrack of nativeTracks) {
          removeVideoTrack(
            /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ nativeTrack as VideoTrack
          );
        }
      };

      const controller = new AbortController();
      const { signal } = controller;
      getPrivate(media).videoTracksCleanup = controller;

      nativeTracks.addEventListener('change', onChange, { signal });
      nativeTracks.addEventListener('addtrack', onAddTrack, { signal });
      nativeTracks.addEventListener('removetrack', onRemoveTrack, { signal });
      currentTracks.addEventListener('addtrack', onCustomAddTrack, { signal });
    }
  }
  return tracks;
}

function getAudioTracks(media: any) {
  let tracks = /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ getPrivate(
    media
  ).audioTracks as AudioTrackList | undefined;
  if (!tracks) {
    tracks = new AudioTrackList();
    getPrivate(media).audioTracks = tracks;

    const nativeEl = media.target;
    const nativeTracks = nativeAudioTracksFn && nativeEl ? nativeAudioTracksFn.call(nativeEl) : undefined;

    if (isNativeTrackList(nativeTracks)) {
      const currentTracks = tracks;

      for (const nativeTrack of nativeTracks) {
        addAudioTrack(media, nativeTrack);
      }

      const onChange = () => {
        currentTracks.dispatchEvent(new Event('change'));
      };

      const onAddTrack = (event: TrackEvent) => {
        if ([...currentTracks].some((track) => track instanceof AudioTrack)) return;
        addAudioTrack(
          media,
          /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ event.track as AudioTrack
        );
      };

      const onRemoveTrack = (event: TrackEvent) => {
        removeAudioTrack(
          /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ event.track as AudioTrack
        );
      };

      // Adding a custom track replaces any mirrored native tracks.
      const onCustomAddTrack = (event: Event) => {
        if (
          !(
            /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
              (event as TrackEvent).track instanceof AudioTrack
            )
          )
        )
          return;
        for (const nativeTrack of nativeTracks) {
          removeAudioTrack(
            /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ nativeTrack as AudioTrack
          );
        }
      };

      const controller = new AbortController();
      const { signal } = controller;
      getPrivate(media).audioTracksCleanup = controller;

      nativeTracks.addEventListener('change', onChange, { signal });
      nativeTracks.addEventListener('addtrack', onAddTrack, { signal });
      nativeTracks.addEventListener('removetrack', onRemoveTrack, { signal });
      currentTracks.addEventListener('addtrack', onCustomAddTrack, { signal });
    }
  }
  return tracks;
}
