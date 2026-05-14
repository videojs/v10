import { listen } from '@videojs/utils/dom';
import { isNull } from '@videojs/utils/predicate';
import { isMediaPauseCapable, isMediaRemotePlaybackCapable } from '../../../core/media/predicate';
import type { MediaControlsState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { findGestureCoordinator } from '../../gesture/coordinator';
import { isRemotePlaybackConnected, isRemotePlaybackConnecting } from '../../presentation/remote-playback';

const IDLE_DELAY = 2000;
const TAP_THRESHOLD = 250;

export const controlsFeature = definePlayerFeature({
  name: 'controls',
  state: ({ get, set }): MediaControlsState => ({
    userActive: true,
    controlsVisible: true,
    toggleControls() {
      // Fallback before attach — no idle timer, just flip state.
      const next = !get().userActive;
      set({ userActive: next, controlsVisible: next });
      return next as boolean;
    },
  }),

  attach({ target, signal, get, set }) {
    const { media, container } = target;

    if (!isMediaPauseCapable(media) || isNull(container)) {
      if (__DEV__ && isNull(container)) {
        console.warn('[vjs] controlsFeature requires a container element for activity tracking.');
      }
      return;
    }

    const computeVisible = (userActive: boolean): boolean => {
      return userActive || media.paused || isRemotePlaybackConnected(media) || isRemotePlaybackConnecting(media);
    };

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

    // Expose toggleControls with access to idle timer.
    set({
      toggleControls() {
        if (get().controlsVisible) {
          setInactive();
        } else {
          setActive();
        }
        return get().controlsVisible;
      },
    });

    // Touch tap-to-toggle
    let pointerDownTime = 0;

    function onPointerDown() {
      pointerDownTime = Date.now();
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerType === 'touch' && Date.now() - pointerDownTime < TAP_THRESHOLD) {
        // When a toggleControls touch tap gesture is registered, it handles toggle — skip inline handler.
        const coordinator = findGestureCoordinator(container as HTMLElement);

        if (
          coordinator?.bindings.some(
            (b) => b.type === 'tap' && b.action === 'toggleControls' && (!b.pointer || b.pointer === 'touch')
          )
        ) {
          return;
        }

        // Inline touch tap-to-toggle for standalone use (no gestures).
        const isMediaOrContainer = [media, container].includes(event.target as HTMLElement);
        if (get().controlsVisible && isMediaOrContainer) {
          setInactive();
        } else {
          setActive();
        }
      } else {
        setActive();
      }
    }

    // Recompute visibility when playback state changes.
    const onPlaybackChange = () => {
      const { userActive } = get();
      set({ controlsVisible: computeVisible(userActive) });

      // When playback starts, schedule idle if user is active.
      if (!media.paused && userActive) {
        scheduleIdle();
      }
    };

    // Container event listeners
    listen(container, 'pointermove', setActive, { signal });
    listen(container, 'pointerdown', onPointerDown, { signal });
    listen(container, 'pointerup', onPointerUp, { signal });
    listen(container, 'keyup', setActive, { signal });
    listen(container, 'focusin', setActive, { signal });
    // On touch devices pointerleave would fire after a pointerup event which hides the controls.
    // https://w3c.github.io/pointerevents/#dfn-pointerup
    listen(container, 'mouseleave', setInactive, { signal });

    // Media event listeners for playback state changes.
    listen(media, 'play', onPlaybackChange, { signal });
    listen(media, 'pause', onPlaybackChange, { signal });
    listen(media, 'ended', onPlaybackChange, { signal });

    // Recompute visibility when cast state changes.
    if (isMediaRemotePlaybackCapable(media)) {
      const onCastChange = () => {
        const { userActive } = get();
        set({ controlsVisible: computeVisible(userActive) });
      };

      listen(media.remote, 'connect', onCastChange, { signal });
      listen(media.remote, 'connecting', onCastChange, { signal });
      listen(media.remote, 'disconnect', onCastChange, { signal });
    }

    // Clean up timer on signal abort.
    signal.addEventListener('abort', clearIdle, { once: true });

    // Always schedule idle initially. When paused, userActive will go false
    // but controlsVisible stays true (because paused keeps controls visible).
    scheduleIdle();
  },
});
