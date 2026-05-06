import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';

/**
 * State shape for playback rate tracking.
 */
export interface PlaybackRateState {
  playbackRate?: number;
}

/**
 * Context shape for playback rate tracking.
 */
export interface PlaybackRateContext {
  mediaElement?: HTMLMediaElement | undefined;
}

/**
 * Track playback rate from the media element.
 *
 * Mirrors `mediaElement.playbackRate` into reactive state on each `ratechange`
 * event. Also syncs immediately when a media element becomes available.
 *
 * @example
 * const cleanup = trackPlaybackRate.setup({ state, context });
 */
function trackPlaybackRateSetup({
  state,
  context,
}: {
  state: { playbackRate: Signal<PlaybackRateState['playbackRate']> };
  context: { mediaElement: ReadonlySignal<PlaybackRateContext['mediaElement']> };
}): () => void {
  const mediaElementSignal = computed(() => context.mediaElement.get());
  const canTrackPlaybackRate = computed(() => !!mediaElementSignal.get());

  const cleanupEffect = effect(() => {
    if (!canTrackPlaybackRate.get()) return;
    const mediaElement = mediaElementSignal.get() as HTMLMediaElement;

    state.playbackRate.set(mediaElement.playbackRate);

    return listen(mediaElement, 'ratechange', () => {
      state.playbackRate.set(mediaElement.playbackRate);
    });
  });

  return () => {
    cleanupEffect();
  };
}

export const trackPlaybackRate = defineBehavior({
  stateKeys: ['playbackRate'],
  contextKeys: ['mediaElement'],
  setup: trackPlaybackRateSetup,
});
