import { listen } from '@videojs/utils/dom';

import { definePlayerFeature } from '../../feature';
import type { PlayerFeatureConfig } from '../../player';
import { isFullscreen } from '../../presentation/fullscreen';
import { createScreenOrientationLock, type ScreenOrientationLockType } from '../../presentation/orientation';

export type { ScreenOrientationLockType };

const DEFAULT_ORIENTATION_LOCK_TYPE: ScreenOrientationLockType = 'landscape';

export interface OrientationLockState {
  /** Screen orientation type locked while fullscreen is active. */
  orientationLockType: ScreenOrientationLockType;
  /** Sets the locked orientation type. Nullish restores the default. */
  setOrientationLockType(value: ScreenOrientationLockType | null | undefined): void;
}

interface WebKitPresentationMedia extends HTMLMediaElement {
  webkitPresentationMode?: string;
}

/**
 * Locks screen orientation while fullscreen is active.
 *
 * The orientation type is provider configuration, so it can change during the
 * player's lifetime. Unsupported browsers and rejected lock requests are
 * ignored.
 */
export const orientationLockFeature = definePlayerFeature({
  name: 'orientationLock',
  config: {
    orientationLockType: {
      action: 'setOrientationLockType',
      state: 'orientationLockType',
    },
  } satisfies PlayerFeatureConfig<OrientationLockState>,
  state: ({ set }): OrientationLockState => ({
    orientationLockType: DEFAULT_ORIENTATION_LOCK_TYPE,
    setOrientationLockType: (value) => set({ orientationLockType: value ?? DEFAULT_ORIENTATION_LOCK_TYPE }),
  }),

  attach({ target, signal, get, store }) {
    const { media, container } = target;
    const orientationLock = createScreenOrientationLock();

    // Resolved from the current value rather than a fullscreen transition, so
    // the same handler serves both fullscreen changes and configuration
    // changes. `lock()` ignores a request for the type it already holds.
    const sync = () => {
      if (isFullscreen(container, media)) {
        void orientationLock.lock(get().orientationLockType);
      } else {
        orientationLock.unlock();
      }
    };

    sync();

    listen(document, 'fullscreenchange', sync, { signal });
    listen(document, 'webkitfullscreenchange', sync, { signal });

    const video = media as WebKitPresentationMedia;
    if ('webkitPresentationMode' in video) {
      listen(media, 'webkitpresentationmodechanged', sync, { signal });
    }

    // `orientationLockType` is published source state, so configuration writes
    // reach this subscription through the normal snapshot notification.
    const unsubscribe = store.subscribe(sync);

    signal.addEventListener(
      'abort',
      () => {
        unsubscribe();
        orientationLock.unlock();
      },
      { once: true }
    );
  },
});
