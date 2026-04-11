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
    setActive() {
      const next = !get().userActive;
      if (next) set({ userActive: true, controlsVisible: true });
    },
    setInactive() {
      set({ userActive: false, controlsVisible: false });
    },
    toggleControls() {
      // Fallback before attach — no idle timer, just flip state.
      const next = !get().userActive;
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
      idleTimer = setTimeout(setInactive, IDLE_DELAY);
    }

    function setActive() {
      if (!get().userActive) {
        set({ userActive: true, controlsVisible: true });
      }
      scheduleIdle();
    }

    function setInactive() {
      clearIdle();
      set({ userActive: false, controlsVisible: computeVisible(false) });
    }

    // Expose methods with access to idle timer.
    set({
      setActive,
      setInactive,
      toggleControls() {
        if (get().controlsVisible) {
          setInactive();
        } else {
          setActive();
        }
        return get().controlsVisible;
      },
    });

    // Recompute visibility when playback state changes.
    function onPlaybackChange() {
      const { userActive } = get();
      set({ controlsVisible: computeVisible(userActive) });

      // When playback starts, schedule idle if user is active.
      if (!media.paused && userActive) {
        scheduleIdle();
      }
    }

    // Media event listeners for playback state changes.
    listen(media, 'play', onPlaybackChange, { signal });
    listen(media, 'pause', onPlaybackChange, { signal });
    listen(media, 'ended', onPlaybackChange, { signal });

    // Clean up timer on signal abort.
    signal.addEventListener('abort', clearIdle, { once: true });

    // Always schedule idle initially. When paused, userActive will go false
    // but controlsVisible stays true (because paused keeps controls visible).
    scheduleIdle();
  },
});
