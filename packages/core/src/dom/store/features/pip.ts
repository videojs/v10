import { listen } from '@videojs/utils/dom';

import type { MediaPictureInPictureState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { exitFullscreen, isFullscreenElement } from '../../presentation/fullscreen';
import {
  exitPictureInPicture,
  isPictureInPictureElement,
  isPictureInPictureEnabled,
  requestPictureInPicture,
} from '../../presentation/pip';
import type { WebKitVideoElement } from '../../presentation/types';

export const pipFeature = definePlayerFeature({
  name: 'pip',
  state: ({ target }): MediaPictureInPictureState => ({
    pip: false,
    pipAvailability: 'unavailable',

    async requestPictureInPicture() {
      const { media, container } = target();

      // Exit fullscreen first if active
      if (isFullscreenElement(container, media)) {
        await exitFullscreen();
      }

      return requestPictureInPicture(media);
    },

    async exitPictureInPicture() {
      const { media } = target();
      return exitPictureInPicture(media);
    },

    async togglePictureInPicture() {
      const { media, container } = target();

      if (isPictureInPictureElement(media)) {
        return exitPictureInPicture(media);
      }

      if (isFullscreenElement(container, media)) {
        await exitFullscreen();
      }

      return requestPictureInPicture(media);
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    set({
      pipAvailability: isPictureInPictureEnabled() ? 'available' : 'unsupported',
    });

    const sync = () =>
      set({
        pip: isPictureInPictureElement(media),
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
