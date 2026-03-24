import { listen } from '@videojs/utils/dom';
import { Signal } from 'signal-polyfill';
import { effect } from '../../core/signals/effect';
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
  mediaElement?: HTMLMediaElement | undefined;
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
export function trackPlaybackRate<O extends PlaybackRateOwners>({
  state,
  owners,
}: {
  state: WritableState<PlaybackRateState>;
  owners: Signal.State<O>;
}): () => void {
  const mediaElementSignal = new Signal.Computed(() => owners.get().mediaElement);
  const canTrackPlaybackRate = new Signal.Computed(() => !!mediaElementSignal.get());

  const cleanupEffect = effect(() => {
    if (!canTrackPlaybackRate.get()) return;
    const mediaElement = mediaElementSignal.get() as HTMLMediaElement;

    state.patch({ playbackRate: mediaElement.playbackRate });

    return listen(mediaElement, 'ratechange', () => {
      state.patch({ playbackRate: mediaElement.playbackRate });
    });
  });

  return () => {
    cleanupEffect();
  };
}
