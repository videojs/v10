import { listen } from '@videojs/utils/dom';

import type { PictureInPictureState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { exitFullscreen, isElementFullscreen } from '../../presentation/fullscreen';
import { enterPiP, exitPiP, isPiPActive, isPiPSupported } from '../../presentation/pip';
import type { WebKitVideoElement } from '../../presentation/types';

export const pipFeature = definePlayerFeature({
  state: ({ target }): PictureInPictureState => ({
    pip: false,
    pipAvailability: 'unavailable',

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
    const { media } = target;

    set({
      pipAvailability: isPiPSupported() ? 'available' : 'unsupported',
    });

    const sync = () =>
      set({
        pip: isPiPActive(media),
      });

    sync();

    listen(media, 'enterpictureinpicture', sync, { signal });
    listen(media, 'leavepictureinpicture', sync, { signal });

    // iOS Safari presentation mode change (covers PiP)
    const video = media as WebKitVideoElement;
    if ('webkitPresentationMode' in video) {
      listen(media, 'webkitpresentationmodechanged', sync, { signal });
    }
  },
});
