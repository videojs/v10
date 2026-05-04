import { listen } from '@videojs/utils/dom';
import { type ContextSignals, defineBehavior, type StateSignals } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';

/**
 * State shape for current time tracking.
 */
export interface CurrentTimeState {
  currentTime?: number;
}

/**
 * Context shape for current time tracking.
 */
export interface CurrentTimeContext {
  mediaElement?: HTMLMediaElement | undefined;
}

/**
 * Check if we can track current time.
 *
 * Requires:
 * - mediaElement exists in context
 */
export function canTrackCurrentTime(context: CurrentTimeContext): boolean {
  return !!context.mediaElement;
}

/**
 * Track current playback position from the media element.
 *
 * Mirrors `mediaElement.currentTime` into reactive state on:
 * - `timeupdate` — fires during playback (~4 Hz)
 * - `seeking` — fires when a seek begins; per spec, `currentTime` is
 *   already at the new position when this event dispatches, so buffer
 *   management can react immediately rather than waiting for `timeupdate`,
 *   which does not fire while paused.
 *
 * Also syncs immediately when a media element becomes available.
 *
 * @example
 * const cleanup = trackCurrentTime.setup({ state, context });
 */
function trackCurrentTimeSetup({
  state,
  context,
}: {
  state: StateSignals<CurrentTimeState>;
  context: ContextSignals<CurrentTimeContext>;
}): () => void {
  let lastMediaElement: HTMLMediaElement | undefined;
  let removeListeners: (() => void) | null = null;

  const cleanupEffect = effect(() => {
    const mediaElement = context.mediaElement.get();

    if (mediaElement === lastMediaElement) return;

    removeListeners?.();
    removeListeners = null;
    lastMediaElement = mediaElement;

    if (!mediaElement) return;

    const sync = () => {
      state.currentTime.set(mediaElement.currentTime);
    };

    // Sync immediately so consumers don't wait for the first event
    sync();
    const removeTimeupdate = listen(mediaElement, 'timeupdate', sync);
    const removeSeeking = listen(mediaElement, 'seeking', sync);
    removeListeners = () => {
      removeTimeupdate();
      removeSeeking();
    };
  });

  return () => {
    removeListeners?.();
    cleanupEffect();
  };
}

export const trackCurrentTime = defineBehavior({
  stateKeys: ['currentTime'],
  contextKeys: ['mediaElement'],
  setup: trackCurrentTimeSetup,
});
