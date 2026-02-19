import { listen } from '@videojs/utils/dom';
import type { WritableState } from '../../core/state/create-state';

/**
 * State shape for current time tracking.
 */
export interface CurrentTimeState {
  currentTime?: number;
}

/**
 * Owners shape for current time tracking.
 */
export interface CurrentTimeOwners {
  mediaElement?: HTMLMediaElement;
}

/**
 * Check if we can track current time.
 *
 * Requires:
 * - mediaElement exists in owners
 */
export function canTrackCurrentTime(owners: CurrentTimeOwners): boolean {
  return !!owners.mediaElement;
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
 * const cleanup = trackCurrentTime({ state, owners });
 */
export function trackCurrentTime({
  state,
  owners,
}: {
  state: WritableState<CurrentTimeState>;
  owners: WritableState<CurrentTimeOwners>;
}): () => void {
  let lastMediaElement: HTMLMediaElement | undefined;
  let removeListeners: (() => void) | null = null;

  const unsubscribe = owners.subscribe((currentOwners) => {
    const { mediaElement } = currentOwners;

    if (mediaElement === lastMediaElement) return;

    removeListeners?.();
    removeListeners = null;
    lastMediaElement = mediaElement;

    if (!mediaElement) return;

    // Sync immediately so consumers don't wait for the first event
    state.patch({ currentTime: mediaElement.currentTime });

    const sync = () => state.patch({ currentTime: mediaElement.currentTime });
    const removeTimeupdate = listen(mediaElement, 'timeupdate', sync);
    const removeSeeking = listen(mediaElement, 'seeking', sync);
    removeListeners = () => {
      removeTimeupdate();
      removeSeeking();
    };
  });

  return () => {
    removeListeners?.();
    unsubscribe();
  };
}
