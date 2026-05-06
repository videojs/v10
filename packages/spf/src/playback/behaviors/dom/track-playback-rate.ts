import { listen } from '@videojs/utils/dom';
import { effect } from '../../../core/signals/effect';
import { computed, type Signal, update } from '../../../core/signals/primitives';

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
  state: Signal<PlaybackRateState>;
  owners: Signal<O>;
}): () => void {
  const mediaElementSignal = computed(() => owners.get().mediaElement);
  const canTrackPlaybackRate = computed(() => !!mediaElementSignal.get());

  const cleanupEffect = effect(() => {
    if (!canTrackPlaybackRate.get()) return;
    const mediaElement = mediaElementSignal.get() as HTMLMediaElement;

    update(state, { playbackRate: mediaElement.playbackRate });

    return listen(mediaElement, 'ratechange', () => {
      update(state, { playbackRate: mediaElement.playbackRate });
    });
  });

  return () => {
    cleanupEffect();
  };
}
