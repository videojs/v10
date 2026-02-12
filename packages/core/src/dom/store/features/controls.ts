import { listen } from '@videojs/utils/dom';
import { isNull } from '@videojs/utils/predicate';

import type { MediaControlsState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

const IDLE_DELAY = 2000;
const TAP_THRESHOLD = 250;

export const controlsFeature = definePlayerFeature({
  state: (): MediaControlsState => ({
    userActive: true,
    controlsVisible: true,
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

    // Touch tap-to-toggle
    let pointerDownTime = 0;

    function onPointerDown() {
      pointerDownTime = Date.now();
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerType === 'touch' && Date.now() - pointerDownTime < TAP_THRESHOLD) {
        if (get().controlsVisible) {
          clearIdle();
          set({ userActive: false, controlsVisible: computeVisible(false) });
        } else {
          setActive();
        }
      } else {
        setActive();
      }
    }

    // Recompute visibility when playback state changes.
    function onPlaybackChange() {
      const { userActive } = get();
      set({ controlsVisible: computeVisible(userActive) });

      // When playback starts, schedule idle if user is active.
      if (!media.paused && userActive) {
        scheduleIdle();
      }
    }

    // Container event listeners
    listen(container, 'pointermove', setActive, { signal });
    listen(container, 'pointerdown', onPointerDown, { signal });
    listen(container, 'pointerup', onPointerUp, { signal });
    listen(container, 'keyup', setActive, { signal });
    listen(container, 'focusin', setActive, { signal });
    listen(container, 'pointerleave', setInactive, { signal });

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
