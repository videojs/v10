import { listen } from '@videojs/utils/dom';

import type { FullscreenState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import {
  enterFullscreen,
  exitFullscreen,
  isElementFullscreen,
  isFullscreenSupported,
} from '../../presentation/fullscreen';
import { exitPiP, isPiPActive } from '../../presentation/pip';
import type { WebKitVideoElement } from '../../presentation/types';

export const fullscreenFeature = definePlayerFeature({
  state: ({ target }): FullscreenState => ({
    fullscreen: false,
    fullscreenAvailability: 'unavailable',

    async requestFullscreen() {
      const { media, container } = target();

      // Exit PiP first if active (browser behavior is inconsistent)
      if (isPiPActive(media)) {
        await exitPiP(media);
      }

      return enterFullscreen(container, media);
    },

    async exitFullscreen() {
      return exitFullscreen();
    },
  }),

  attach({ target, signal, set }) {
    const { media, container } = target;

    set({
      fullscreenAvailability: isFullscreenSupported() ? 'available' : 'unsupported',
    });

    const sync = () =>
      set({
        fullscreen: isElementFullscreen(container, media),
      });

    sync();

    listen(document, 'fullscreenchange', sync, { signal });
    listen(document, 'webkitfullscreenchange', sync, { signal });

    // iOS Safari presentation mode change (covers fullscreen)
    const video = media as WebKitVideoElement;
    if ('webkitPresentationMode' in video) {
      listen(media, 'webkitpresentationmodechanged', sync, { signal });
    }
  },
});
