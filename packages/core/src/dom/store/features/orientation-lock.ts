import { listen } from '@videojs/utils/dom';

import { definePlayerFeature } from '../../feature';
import { isFullscreen } from '../../presentation/fullscreen';
import { createScreenOrientationLock, type ScreenOrientationLockType } from '../../presentation/orientation';
import type { WebKitVideoElement } from '../../presentation/types';

export interface OrientationLockFeatureConfig {
  /** Screen orientation type to lock while fullscreen is active. */
  type?: ScreenOrientationLockType | undefined;
}

export const orientationLockFeature = definePlayerFeature(
  {
    name: 'orientationLock',
    state: () => ({}),

    attach({ target, signal }, config: OrientationLockFeatureConfig) {
      const { media, container } = target;
      const orientationLock = createScreenOrientationLock({ type: config.type });

      let wasFullscreen = false;
      const sync = () => {
        const fullscreen = isFullscreen(container, media);

        if (!wasFullscreen && fullscreen) {
          void orientationLock.lock();
        } else if (wasFullscreen && !fullscreen) {
          orientationLock.unlock();
        }

        wasFullscreen = fullscreen;
      };

      sync();

      listen(document, 'fullscreenchange', sync, { signal });
      listen(document, 'webkitfullscreenchange', sync, { signal });

      const video = media as WebKitVideoElement;
      if ('webkitPresentationMode' in video) {
        listen(media, 'webkitpresentationmodechanged', sync, { signal });
      }

      signal.addEventListener('abort', () => orientationLock.unlock(), { once: true });
    },
  },
  { type: 'landscape' } satisfies OrientationLockFeatureConfig
);
