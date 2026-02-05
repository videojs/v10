import { listen } from '@videojs/utils/dom';

import type { PresentationState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import {
  enterFullscreen,
  exitFullscreen,
  isElementFullscreen,
  isFullscreenSupported,
} from '../../presentation/fullscreen';
import { enterPiP, exitPiP, isPiPActive, isPiPSupported } from '../../presentation/pip';
import type { WebKitVideoElement } from '../../presentation/types';

export const presentationFeature = definePlayerFeature({
  state: ({ target }): PresentationState => ({
    fullscreenActive: false,
    pipActive: false,
    fullscreenAvailability: 'unavailable',
    pipAvailability: 'unavailable',

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

    async requestPiP() {
      const { media, container } = target();

      // Exit fullscreen first if active
      if (isElementFullscreen(container, media)) {
        await exitFullscreen();
      }

      return enterPiP(media);
    },

    async exitPiP() {
      const { media } = target();
      return exitPiP(media);
    },
  }),

  attach({ target, signal, set }) {
    const { media, container } = target;

    set({
      fullscreenAvailability: isFullscreenSupported() ? 'available' : 'unsupported',
      pipAvailability: isPiPSupported() ? 'available' : 'unsupported',
    });

    const sync = () =>
      set({
        fullscreenActive: isElementFullscreen(container, media),
        pipActive: isPiPActive(media),
      });

    sync();

    listen(document, 'fullscreenchange', sync, { signal });
    listen(document, 'webkitfullscreenchange', sync, { signal });

    listen(media, 'enterpictureinpicture', sync, { signal });
    listen(media, 'leavepictureinpicture', sync, { signal });

    // iOS Safari presentation mode change (covers both fullscreen and PiP)
    const video = media as WebKitVideoElement;
    if ('webkitPresentationMode' in video) {
      listen(media, 'webkitpresentationmodechanged', sync, { signal });
    }
  },
});
