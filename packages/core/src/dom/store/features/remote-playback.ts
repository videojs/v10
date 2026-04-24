import { listen } from '@videojs/utils/dom';

import type { MediaRemotePlaybackState, RemotePlaybackConnectionState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { isMediaRemotePlaybackCapable } from '../../media/predicate';
import { exitFullscreen, isFullscreenElement } from '../../presentation/fullscreen';
import { isRemotePlaybackConnected, requestRemotePlayback } from '../../presentation/remote-playback';

export const remotePlaybackFeature = definePlayerFeature({
  name: 'remotePlayback',
  state: ({ target }): MediaRemotePlaybackState => ({
    remotePlaybackState: 'disconnected',
    remotePlaybackAvailability: 'unavailable',

    async toggleRemotePlayback() {
      const { media, container } = target();

      if (isRemotePlaybackConnected(media)) {
        return requestRemotePlayback(media);
      }

      if (isFullscreenElement(container, media)) {
        await exitFullscreen(media);
      }

      return requestRemotePlayback(media);
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaRemotePlaybackCapable(media)) return;

    const syncState = () => set({ remotePlaybackState: media.remote.state as RemotePlaybackConnectionState });

    syncState();

    listen(media.remote, 'connect', syncState, { signal });
    listen(media.remote, 'connecting', syncState, { signal });
    listen(media.remote, 'disconnect', syncState, { signal });

    media.remote
      .watchAvailability((available: boolean) => {
        set({ remotePlaybackAvailability: available ? 'available' : 'unavailable' });
      })
      .catch(() => {
        set({ remotePlaybackAvailability: 'unsupported' });
      });

    signal.addEventListener('abort', () => {
      media.remote?.cancelWatchAvailability().catch(() => {});
    });
  },
});
