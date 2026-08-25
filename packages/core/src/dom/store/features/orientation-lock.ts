import { createSelector } from '@videojs/store';
import { listen, type WebKitVideoElement } from '@videojs/utils/dom';
import { isNull } from '@videojs/utils/predicate';

import { definePlayerFeature } from '../../feature';
import type { PlayerFeatureConfig } from '../../player';
import { isFullscreen } from '../../presentation/fullscreen';
import { createScreenOrientationLock, type ScreenOrientationLockType } from '../../presentation/orientation';

export type { ScreenOrientationLockType };

const DEFAULT_ORIENTATION_LOCK_TYPE: ScreenOrientationLockType = 'landscape';

/** Orientation lock configuration and its user-config writer. */
export interface OrientationLockState {
  /** Screen orientation type locked while fullscreen is active. */
  orientationLockType: ScreenOrientationLockType;
  /**
   * Sets the locked orientation type. Absent input — nullish, or the empty string a valueless HTML attribute produces —
   * restores the default.
   */
  setOrientationLockType(value: ScreenOrientationLockType | null | undefined): void;
}

/**
 * Locks screen orientation while fullscreen is active.
 *
 * The orientation type is provider configuration, so it can change during the player's lifetime. Unsupported browsers
 * and rejected lock requests are ignored.
 */
export const orientationLockFeature = definePlayerFeature({
  name: 'orientationLock',
  config: {
    /** Screen orientation type to lock while fullscreen is active. */
    orientationLockType: {
      action: 'setOrientationLockType',
      state: 'orientationLockType',
    },
  } satisfies PlayerFeatureConfig<OrientationLockState>,
  state: ({ set }): OrientationLockState => ({
    orientationLockType: DEFAULT_ORIENTATION_LOCK_TYPE,
    // `||` rather than `??`: a valueless HTML attribute arrives as `''`, which
    // is absent input, not a request to lock to the empty string.
    setOrientationLockType: (value) => set({ orientationLockType: value || DEFAULT_ORIENTATION_LOCK_TYPE }),
  }),

  attach({ target, signal, get, store }) {
    const { media, container } = target;
    const orientationLock = createScreenOrientationLock();

    // Type that should be held right now, or null when not fullscreen.
    let synced: ScreenOrientationLockType | null = null;

    // Resolved from current values rather than a fullscreen transition, so the
    // same handler serves both fullscreen changes and configuration changes.
    // Comparing the resolved value is what keeps the store subscription below
    // from re-issuing a platform request on every unrelated state change.
    const sync = () => {
      const next = isFullscreen(container, media) ? get().orientationLockType : null;
      if (next === synced) return;

      synced = next;

      if (isNull(next)) {
        orientationLock.unlock();
      } else {
        void orientationLock.lock(next);
      }
    };

    sync();

    listen(document, 'fullscreenchange', sync, { signal });
    listen(document, 'webkitfullscreenchange', sync, { signal });

    // iOS Safari presentation mode change (covers fullscreen)
    const video = media as WebKitVideoElement;

    if ('webkitPresentationMode' in video) {
      listen(media, 'webkitpresentationmodechanged', sync, { signal });
    }

    // `orientationLockType` is published source state, so configuration writes
    // reach this subscription through the normal snapshot notification. It
    // fires for every published change, which `sync` filters.
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

// Declared here rather than in `../selectors`, because `createSelector`
// evaluates its slice at module load and every selector in that module shares
// one evaluation. An entry there would retain this feature in every bundle
// importing any selector, and this feature ships in no preset, so that is
// weight for players that never select it — measured at +290 B per
// `@videojs/html` UI component and +298 B per React one. `UTIL_ENTRY_POINTS`
// in the site's api-docs-builder scans this module so the selector still gets
// a reference page.
/**
 * Select the orientation lock state (`orientationLockType`, `setOrientationLockType`). Returns `undefined` when the
 * feature is not configured.
 */
export const selectOrientationLock = createSelector(orientationLockFeature);
