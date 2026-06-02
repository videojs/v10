import { listen } from '@videojs/utils/dom';

import type { MediaRemotePlaybackState, RemotePlaybackConnectionState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { isMediaRemotePlaybackCapable, isMediaRemotePlaybackHost } from '../../media/predicate';
import { exitFullscreen, isFullscreen } from '../../presentation/fullscreen';

/** WebKit-only addition to HTMLMediaElement exposing the active AirPlay flag. */
interface WebKitAirplayMedia extends HTMLMediaElement {
  readonly webkitCurrentPlaybackTargetIsWireless: boolean;
}

/** WebKit-specific availability event payload (not in lib.dom). */
type WebkitAvailabilityEvent = Event & { availability: 'available' | 'not-available' };

function isWebKitAirplayCapable(media: EventTarget): media is WebKitAirplayMedia {
  return 'WebKitPlaybackTargetAvailabilityEvent' in globalThis && 'webkitCurrentPlaybackTargetIsWireless' in media;
}

export const remotePlaybackFeature = definePlayerFeature({
  name: 'remotePlayback',
  state: ({ target }): MediaRemotePlaybackState => ({
    remotePlaybackState: 'disconnected',
    remotePlaybackAvailability: 'unsupported',

    async toggleRemotePlayback() {
      const { media, container } = target();

      const remote = isMediaRemotePlaybackCapable(media) ? media.remote : null;

      if (!remote) {
        throw new DOMException('Remote playback not supported', 'NotSupportedError');
      }

      if (remote.state === 'connected') {
        return remote.prompt();
      }

      if (isFullscreen(container, media)) {
        await exitFullscreen(media);
      }

      return await remote.prompt();
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaRemotePlaybackCapable(media)) return;

    let abort: AbortController | null = null;
    let watchId: number | undefined;
    let watchedRemote: typeof media.remote | null = null;

    const cleanup = () => {
      abort?.abort();
      abort = null;

      if (watchedRemote && watchId !== undefined) {
        watchedRemote.cancelWatchAvailability(watchId).catch(() => {});
      }

      watchedRemote = null;
      watchId = undefined;
    };

    const attachWebKitAirPlay = () => {
      const airplayMedia = media as unknown as WebKitAirplayMedia;

      abort = new AbortController();

      const syncConnection = () => {
        set({
          remotePlaybackState: airplayMedia.webkitCurrentPlaybackTargetIsWireless ? 'connected' : 'disconnected',
        });
      };

      const syncAvailability = (event: Event) => {
        const { availability } = event as WebkitAvailabilityEvent;
        set({ remotePlaybackAvailability: availability === 'available' ? 'available' : 'unavailable' });
      };

      listen(airplayMedia, 'webkitplaybacktargetavailabilitychanged', syncAvailability, { signal: abort.signal });
      listen(airplayMedia, 'webkitcurrentplaybacktargetiswirelesschanged', syncConnection, { signal: abort.signal });

      syncConnection();
    };

    const attachRemote = (remote: typeof media.remote) => {
      if (!remote) {
        set({
          remotePlaybackState: 'disconnected',
          remotePlaybackAvailability: 'unsupported',
        });
        return;
      }

      abort = new AbortController();
      watchedRemote = remote;

      const syncState = () => set({ remotePlaybackState: remote.state as RemotePlaybackConnectionState });

      syncState();

      listen(remote, 'connect', syncState, { signal: abort.signal });
      listen(remote, 'connecting', syncState, { signal: abort.signal });
      listen(remote, 'disconnect', syncState, { signal: abort.signal });

      remote
        .watchAvailability((available: boolean) => {
          set({ remotePlaybackAvailability: available ? 'available' : 'unavailable' });
        })
        .then((id) => {
          if (watchedRemote !== remote || abort?.signal.aborted) {
            remote.cancelWatchAvailability(id).catch(() => {});
            return;
          }

          watchId = id;
        })
        .catch(() => {
          set({ remotePlaybackAvailability: 'unsupported' });
        });
    };

    const attachRemotePlayback = () => {
      cleanup();

      if (isMediaRemotePlaybackHost(media) && media.remoteTarget?.supported) {
        attachRemote(media.remote);
        return;
      }

      // Safari's W3C `media.remote` events don't fire reliably for AirPlay
      // session changes, so use WebKit events unless a custom remote target is active.
      if (isWebKitAirplayCapable(media)) {
        attachWebKitAirPlay();
        return;
      }

      attachRemote(media.remote);
    };

    attachRemotePlayback();

    if (isMediaRemotePlaybackHost(media)) {
      listen(media, 'remotetargetchange', attachRemotePlayback, { signal });
    }

    signal.addEventListener('abort', () => cleanup(), { once: true });
  },
});
