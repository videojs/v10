import { listen } from '@videojs/utils/dom';

import type { MediaFullscreenState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import {
  exitFullscreen,
  isFullscreenElement,
  isFullscreenEnabled,
  requestFullscreen,
} from '../../presentation/fullscreen';
import { exitPictureInPicture, isPictureInPictureElement } from '../../presentation/pip';
import type { WebKitVideoElement } from '../../presentation/types';

export const fullscreenFeature = definePlayerFeature({
  name: 'fullscreen',
  state: ({ target }): MediaFullscreenState => ({
    fullscreen: false,
    fullscreenAvailability: 'unavailable',

    async requestFullscreen() {
      const { media, container } = target();

      // Exit PiP first if active (browser behavior is inconsistent)
      if (isPictureInPictureElement(media)) {
        await exitPictureInPicture(media);
      }

      return requestFullscreen(container, media);
    },

    async exitFullscreen() {
      const { media } = target();
      return exitFullscreen(media);
    },
  }),

  attach({ target, signal, set }) {
    const { media, container } = target;

    set({
      fullscreenAvailability: isFullscreenEnabled() ? 'available' : 'unsupported',
    });

    const sync = () =>
      set({
        fullscreen: isFullscreenElement(container, media),
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
