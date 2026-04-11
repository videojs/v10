import { listen } from '@videojs/utils/dom';
import { isNull } from '@videojs/utils/predicate';

import type { MediaControlsState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

const IDLE_DELAY = 2000;

export const controlsFeature = definePlayerFeature({
  name: 'controls',
  state: ({ get, set }): MediaControlsState => ({
    userActive: true,
    controlsVisible: true,
    setUserActivity() {},
    showControls() {},
    hideControls() {},
    toggleControls() {
      // Fallback before attach — no idle timer, just flip state.
      const next = !get().controlsVisible;
      set({ userActive: next, controlsVisible: next });
      return next as boolean;
    },
  }),

  attach({ target, signal, get, set }) {
    const { media, container } = target;

    if (isNull(container)) {
      if (__DEV__) {
        console.warn('[vjs] controlsFeature requires a container element for activity tracking.');
      }
      return;
    }

    function computeVisible(userActive: boolean): boolean {
      return userActive || media.paused;
    }

    // Idle timer
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    function clearIdle() {
      clearTimeout(idleTimer);
      idleTimer = undefined;
    }

    function scheduleIdle() {
      clearIdle();
      idleTimer = setTimeout(() => {
        clearIdle();
        set({ userActive: false, controlsVisible: computeVisible(false) });
      }, IDLE_DELAY);
    }

    // Recompute visibility when playback state changes.
    function onPlaybackChange() {
      const { userActive } = get();
      set({ controlsVisible: computeVisible(userActive) });

      if (!media.paused && userActive) {
        scheduleIdle();
      }
    }

    // Expose methods with idle timer access.
    set({
      setUserActivity(active: boolean) {
        if (active) {
          if (!get().userActive) {
            set({ userActive: true, controlsVisible: true });
          }
          scheduleIdle();
        } else {
          clearIdle();
          set({ userActive: false, controlsVisible: computeVisible(false) });
        }
      },
      showControls() {
        set({ userActive: true, controlsVisible: true });
        scheduleIdle();
      },
      hideControls() {
        clearIdle();
        set({ userActive: false, controlsVisible: computeVisible(false) });
      },
      toggleControls() {
        if (get().controlsVisible) {
          clearIdle();
          set({ userActive: false, controlsVisible: computeVisible(false) });
        } else {
          set({ userActive: true, controlsVisible: true });
          scheduleIdle();
        }
        return get().controlsVisible;
      },
    });

    // Media event listeners for playback state changes.
    listen(media, 'play', onPlaybackChange, { signal });
    listen(media, 'pause', onPlaybackChange, { signal });
    listen(media, 'ended', onPlaybackChange, { signal });

    // Clean up timer on signal abort.
    signal.addEventListener('abort', clearIdle, { once: true });

    // Schedule initial idle.
    scheduleIdle();
  },
});
