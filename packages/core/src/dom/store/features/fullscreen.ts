import { listen } from '@videojs/utils/dom';

import type { MediaFullscreenState } from '../../../core/media/state';
import { type ConfigurablePlayerFeature, definePlayerFeature } from '../../feature';
import { exitFullscreen, isFullscreen, isFullscreenEnabled, requestFullscreen } from '../../presentation/fullscreen';
import {
  createScreenOrientationLock,
  type ScreenOrientationLock,
  type ScreenOrientationLockType,
} from '../../presentation/orientation';
import { exitPictureInPicture, isPictureInPicture } from '../../presentation/pip';
import type { WebKitVideoElement } from '../../presentation/types';

const ORIENTATION_LOCK_SYMBOL = Symbol('@videojs/fullscreen-orientation-lock');

type FullscreenState = MediaFullscreenState & {
  [ORIENTATION_LOCK_SYMBOL]: ScreenOrientationLock;
};

export type FullscreenOrientationLock = ScreenOrientationLockType;

export interface FullscreenFeatureConfig {
  /** Lock the screen orientation while fullscreen is active. Pass `false` to disable. */
  orientationLock?: FullscreenOrientationLock | undefined;
}

export type ConfigurableFullscreenFeature = ConfigurablePlayerFeature<FullscreenFeatureConfig, MediaFullscreenState>;

function getOrientationLock(state: Readonly<MediaFullscreenState>) {
  return (state as Readonly<Partial<FullscreenState>>)[ORIENTATION_LOCK_SYMBOL];
}

export const fullscreenFeature: ConfigurableFullscreenFeature = definePlayerFeature(
  {
    name: 'fullscreen',
    state: ({ target }, config: FullscreenFeatureConfig): MediaFullscreenState => {
      const orientationLock = createScreenOrientationLock({ type: config.orientationLock });

      const enterFullscreen = async () => {
        const { media, container } = target();

        // Exit PiP first if active (browser behavior is inconsistent)
        if (isPictureInPicture(media)) {
          await exitPictureInPicture(media);
        }

        await requestFullscreen(container, media);
        await orientationLock.lock();
      };

      const leaveFullscreen = async () => {
        const { media } = target();

        try {
          return await exitFullscreen(media);
        } finally {
          orientationLock.unlock();
        }
      };

      const state: FullscreenState = {
        [ORIENTATION_LOCK_SYMBOL]: orientationLock,
        fullscreen: false,
        fullscreenAvailability: 'unavailable',
        requestFullscreen: enterFullscreen,
        exitFullscreen: leaveFullscreen,

        async toggleFullscreen() {
          const { media, container } = target();

          if (isFullscreen(container, media)) {
            return leaveFullscreen();
          }

          return enterFullscreen();
        },
      };

      return state;
    },

    attach({ target, signal, set, get }) {
      const { media, container } = target;

      set({
        fullscreenAvailability: isFullscreenEnabled() ? 'available' : 'unsupported',
      });

      let wasFullscreen = false;
      const sync = () => {
        const fullscreen = isFullscreen(container, media);

        if (wasFullscreen && !fullscreen) {
          getOrientationLock(get())?.unlock();
        }

        wasFullscreen = fullscreen;
        set({ fullscreen });
      };

      sync();

      listen(document, 'fullscreenchange', sync, { signal });
      listen(document, 'webkitfullscreenchange', sync, { signal });

      // iOS Safari presentation mode change (covers fullscreen)
      const video = media as WebKitVideoElement;
      if ('webkitPresentationMode' in video) {
        listen(media, 'webkitpresentationmodechanged', sync, { signal });
      }

      signal.addEventListener(
        'abort',
        () => {
          getOrientationLock(get())?.unlock();
        },
        { once: true }
      );
    },
  },
  {}
);
