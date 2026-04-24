import { listen } from '@videojs/utils/dom';
import type { MediaFullscreenState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import {
  exitFullscreen,
  isFullscreenElement,
  isFullscreenEnabled,
  requestFullscreen,
} from '../../presentation/fullscreen';

export const fullscreenFeature = definePlayerFeature({
  name: 'fullscreen',
  state: ({ target }): MediaFullscreenState => ({
    fullscreen: false,
    fullscreenAvailability: 'unavailable',

    async requestFullscreen() {
      const { media, container } = target();

      // Exit PiP first if active (browser behavior is inconsistent)
      if (media.isPictureInPicture) {
        await media.exitPictureInPicture();
      }

      return requestFullscreen(container, media);
    },

    async exitFullscreen() {
      const { media } = target();
      return exitFullscreen(media);
    },

    async toggleFullscreen() {
      const { media, container } = target();

      if (isFullscreenElement(container, media)) {
        return exitFullscreen(media);
      }

      if (media.isPictureInPicture) {
        await media.exitPictureInPicture();
      }

      return requestFullscreen(container, media);
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

    // The video host normalizes WebKit-only element-level events
    // (webkitpresentationmodechanged, webkitfullscreenchange) into a
    // bubbling fullscreenchange event on itself.
    listen(media, 'fullscreenchange', sync, { signal });
  },
});
