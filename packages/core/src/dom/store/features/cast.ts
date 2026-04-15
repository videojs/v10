import { listen } from '@videojs/utils/dom';

import type { CastState, MediaCastState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { isMediaRemotePlaybackCapable } from '../../media/predicate';
import { isCastConnected, requestCast } from '../../presentation/cast';
import { exitFullscreen, isFullscreenElement } from '../../presentation/fullscreen';

export const castFeature = definePlayerFeature({
  name: 'cast',
  state: ({ target }): MediaCastState => ({
    castState: 'disconnected',
    castAvailability: 'unavailable',

    async requestCast() {
      const { media, container } = target();

      if (isFullscreenElement(container, media)) {
        await exitFullscreen();
      }

      return requestCast(media);
    },

    async exitCast() {
      const { media } = target();
      return requestCast(media);
    },

    async toggleCast() {
      const { media, container } = target();

      if (isCastConnected(media)) {
        return requestCast(media);
      }

      if (isFullscreenElement(container, media)) {
        await exitFullscreen();
      }

      return requestCast(media);
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaRemotePlaybackCapable(media)) return;

    const syncState = () => set({ castState: media.remote.state as CastState });

    syncState();

    listen(media.remote, 'connect', syncState, { signal });
    listen(media.remote, 'connecting', syncState, { signal });
    listen(media.remote, 'disconnect', syncState, { signal });

    media.remote
      .watchAvailability((available: boolean) => {
        set({ castAvailability: available ? 'available' : 'unavailable' });
      })
      .catch(() => {
        set({ castAvailability: 'unsupported' });
      });

    signal.addEventListener('abort', () => {
      media.remote?.cancelWatchAvailability().catch(() => {});
    });
  },
});
