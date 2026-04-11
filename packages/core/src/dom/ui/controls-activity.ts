import { isInteractiveTarget, listen } from '@videojs/utils/dom';

const IDLE_DELAY = 2000;
const TAP_THRESHOLD = 250;

export interface ControlsActivityOptions {
  getContainer: () => HTMLElement;
  getMedia: () => HTMLMediaElement;
  getControlsVisible: () => boolean;
  getUserActive: () => boolean;
  setControls: (userActive: boolean, controlsVisible: boolean) => void;
}

export interface ControlsActivityApi {
  destroy: () => void;
}

/**
 * Wire up controls activity tracking on a container element.
 *
 * Manages idle timer, pointer/keyboard activity detection, touch
 * tap-to-toggle, and playback state visibility recomputation.
 */
export function createControlsActivity(options: ControlsActivityOptions): ControlsActivityApi {
  const container = options.getContainer();
  const media = options.getMedia();
  const disconnect = new AbortController();
  const { signal } = disconnect;

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

  function computeVisible(userActive: boolean): boolean {
    return userActive || media.paused;
  }

  function setActive() {
    if (!options.getUserActive()) {
      options.setControls(true, true);
    }
    scheduleIdle();
  }

  function setInactive() {
    clearIdle();
    options.setControls(false, computeVisible(false));
  }

  function toggleControls() {
    if (options.getControlsVisible()) {
      setInactive();
    } else {
      setActive();
    }
  }

  // Touch tap-to-toggle
  let pointerDownTime = 0;

  function onPointerDown() {
    pointerDownTime = Date.now();
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerType === 'touch' && Date.now() - pointerDownTime < TAP_THRESHOLD) {
      // Touch tap on interactive controls (buttons, sliders) — skip toggle.
      if (isInteractiveTarget(event)) return;

      toggleControls();
      return;
    }

    // Non-touch pointer up (mouse click, pen) — treat as activity.
    setActive();
  }

  // Recompute visibility when playback state changes.
  function onPlaybackChange() {
    const userActive = options.getUserActive();
    options.setControls(userActive, computeVisible(userActive));

    // When playback starts, schedule idle if user is active.
    if (!media.paused && userActive) {
      scheduleIdle();
    }
  }

  // Container event listeners
  listen(container, 'pointermove', setActive, { signal });
  listen(container, 'pointerdown', onPointerDown, { signal });
  listen(container, 'pointerup', onPointerUp as EventListener, { signal });
  listen(container, 'keyup', setActive, { signal });
  listen(container, 'focusin', setActive, { signal });
  // On touch devices pointerleave would fire after a pointerup event which hides the controls.
  // https://w3c.github.io/pointerevents/#dfn-pointerup
  listen(container, 'mouseleave', setInactive, { signal });

  // Media event listeners for playback state changes.
  listen(media, 'play', onPlaybackChange, { signal });
  listen(media, 'pause', onPlaybackChange, { signal });
  listen(media, 'ended', onPlaybackChange, { signal });

  // Clean up timer on signal abort.
  signal.addEventListener('abort', clearIdle, { once: true });

  // Schedule initial idle.
  scheduleIdle();

  return {
    destroy() {
      disconnect.abort();
    },
  };
}
