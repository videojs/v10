import { listen } from '@videojs/utils/dom';

import type { MediaFullscreenState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { resolveHTMLVideoElement } from '../../media/predicate';
import { isWebKitDocument } from '../../presentation';
import {
  exitFullscreen,
  isFullscreenElement,
  isFullscreenEnabled,
  requestFullscreen,
} from '../../presentation/fullscreen';
import { exitPictureInPicture, isPictureInPictureElement } from '../../presentation/pip';

export const fullscreenFeature = definePlayerFeature({
  name: 'fullscreen',
  state: ({ target }): MediaFullscreenState => {
    function enterFullscreen(): Promise<void> {
      const { media, container } = target();

      if (isPictureInPictureElement(media)) {
        // Exit PiP first if active (browser behavior is inconsistent)
        return exitPictureInPicture(media).then(() => requestFullscreen(container, media));
      }

      return requestFullscreen(container, media);
    }

    return {
      fullscreen: false,
      fullscreenAvailability: 'unavailable',

      requestFullscreen: enterFullscreen,

      exitFullscreen() {
        const { media } = target();
        return exitFullscreen(media);
      },

      toggleFullscreen() {
        const { media, container } = target();

        if (isFullscreenElement(container, media)) {
          return exitFullscreen(media);
        }

        return enterFullscreen();
      },
    };
  },

  attach({ target, signal, set }) {
    const { media, container } = target;

    const sync = () =>
      set({
        fullscreenAvailability: isFullscreenEnabled(media) ? 'available' : 'unsupported',
        fullscreen: isFullscreenElement(container, media),
      });

    sync();

    listen(media, 'play', sync, { signal });
    listen(document, 'fullscreenchange', sync, { signal });

    if (isWebKitDocument(document)) {
      listen(document, 'webkitfullscreenchange', sync, { signal });
    }

    // iOS Safari presentation mode change (covers fullscreen)
    const video = resolveHTMLVideoElement(media);
    if (video && 'webkitPresentationMode' in video) {
      listen(video, 'webkitpresentationmodechanged', sync, { signal });
    }
  },
});
