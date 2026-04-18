import { listen } from '@videojs/utils/dom';

import type { MediaPictureInPictureState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { resolveHTMLVideoElement } from '../../media/predicate';
import { exitFullscreen, isFullscreenElement } from '../../presentation/fullscreen';
import {
  exitPictureInPicture,
  isPictureInPictureElement,
  isPictureInPictureEnabled,
  requestPictureInPicture,
} from '../../presentation/pip';

export const pipFeature = definePlayerFeature({
  name: 'pip',
  state: ({ target }): MediaPictureInPictureState => {
    function enterPictureInPicture(): Promise<unknown> {
      const { media, container } = target();

      if (isFullscreenElement(container, media)) {
        // Exit fullscreen first if active
        return exitFullscreen(media).then(() => requestPictureInPicture(media));
      }

      return requestPictureInPicture(media);
    }

    return {
      pip: false,
      pipAvailability: 'unavailable',

      requestPictureInPicture: enterPictureInPicture,

      exitPictureInPicture() {
        const { media } = target();
        return exitPictureInPicture(media);
      },

      togglePictureInPicture() {
        const { media } = target();

        if (isPictureInPictureElement(media)) {
          return exitPictureInPicture(media);
        }

        return enterPictureInPicture();
      },
    };
  },

  attach({ target, signal, set }) {
    const { media } = target;

    const sync = () =>
      set({
        pipAvailability: isPictureInPictureEnabled(media) ? 'available' : 'unsupported',
        pip: isPictureInPictureElement(media),
      });

    sync();

    listen(media, 'play', sync, { signal });
    listen(media, 'enterpictureinpicture', sync, { signal });
    listen(media, 'leavepictureinpicture', sync, { signal });

    // iOS Safari presentation mode change (covers PiP)
    const video = resolveHTMLVideoElement(media);
    if (video && 'webkitPresentationMode' in video) {
      listen(video, 'webkitpresentationmodechanged', sync, { signal });
    }
  },
});
