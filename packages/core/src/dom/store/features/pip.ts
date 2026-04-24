import { listen } from '@videojs/utils/dom';
import type { MediaPictureInPictureState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { exitFullscreen, isFullscreenElement } from '../../presentation/fullscreen';
import { isPictureInPictureEnabled } from '../../presentation/pip';

export const pipFeature = definePlayerFeature({
  name: 'pip',
  state: ({ target }): MediaPictureInPictureState => ({
    pip: false,
    pipAvailability: 'unavailable',

    async requestPictureInPicture() {
      const { media, container } = target();

      // Exit fullscreen first if active
      if (isFullscreenElement(container, media)) {
        await exitFullscreen(media);
      }

      await media.requestPictureInPicture();
    },

    async exitPictureInPicture() {
      const { media } = target();
      return media.exitPictureInPicture();
    },

    async togglePictureInPicture() {
      const { media, container } = target();

      if (media.isPictureInPicture) {
        return media.exitPictureInPicture();
      }

      if (isFullscreenElement(container, media)) {
        await exitFullscreen(media);
      }

      await media.requestPictureInPicture();
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    set({
      pipAvailability: isPictureInPictureEnabled() ? 'available' : 'unsupported',
    });

    const sync = () =>
      set({
        pip: media.isPictureInPicture,
      });

    sync();

    listen(media, 'enterpictureinpicture', sync, { signal });
    listen(media, 'leavepictureinpicture', sync, { signal });
  },
});
