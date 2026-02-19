import { listen } from '@videojs/utils/dom';
import type { WritableState } from '../../core/state/create-state';

/**
 * State shape for playback rate tracking.
 */
export interface PlaybackRateState {
  playbackRate?: number;
}

/**
 * Owners shape for playback rate tracking.
 */
export interface PlaybackRateOwners {
  mediaElement?: HTMLMediaElement;
}

/**
 * Check if we can track playback rate.
 *
 * Requires:
 * - mediaElement exists in owners
 */
export function canTrackPlaybackRate(owners: PlaybackRateOwners): boolean {
  return !!owners.mediaElement;
}

/**
 * Track playback rate from the media element.
 *
 * Mirrors `mediaElement.playbackRate` into reactive state on each `ratechange`
 * event. Also syncs immediately when a media element becomes available.
 *
 * @example
 * const cleanup = trackPlaybackRate({ state, owners });
 */
export function trackPlaybackRate({
  state,
  owners,
}: {
  state: WritableState<PlaybackRateState>;
  owners: WritableState<PlaybackRateOwners>;
}): () => void {
  let lastMediaElement: HTMLMediaElement | undefined;
  let removeListener: (() => void) | null = null;

  const unsubscribe = owners.subscribe((currentOwners) => {
    const { mediaElement } = currentOwners;

    if (mediaElement === lastMediaElement) return;

    removeListener?.();
    removeListener = null;
    lastMediaElement = mediaElement;

    if (!mediaElement) return;

    state.patch({ playbackRate: mediaElement.playbackRate });

    removeListener = listen(mediaElement, 'ratechange', () => {
      state.patch({ playbackRate: mediaElement.playbackRate });
    });
  });

  return () => {
    removeListener?.();
    unsubscribe();
  };
}
