import { listen } from '@videojs/utils/dom';
import type { EventStream } from '../../core/events/create-event-stream';
import type { PresentationAction } from '../../core/features/resolve-presentation';
import { effect } from '../../core/signals/effect';
import { computed, type Signal, signal } from '../../core/signals/primitives';

/**
 * State shape for playback initiation tracking.
 */
export interface PlaybackInitiatedState {
  /** True once play has been requested for the current presentation URL. */
  playbackInitiated?: boolean;
  /** Current presentation — URL is used to detect source changes. */
  presentation?: { url?: string };
}

/**
 * Owners shape for playback initiation tracking.
 */
export interface PlaybackInitiatedOwners {
  mediaElement?: HTMLMediaElement | undefined;
}

/**
 * Track whether playback has been initiated for the current presentation URL.
 *
 * Models playbackInitiated as a merge of two streams:
 * - false stream: resets on URL change or media element swap
 * - true stream: sets on play event
 *
 * Encoded as a version counter pair so the result is a pure computed —
 * `playbackInitiated` is true when the last play happened at or after
 * the last reset, false otherwise.
 *
 * @example
 * const cleanup = trackPlaybackInitiated({ state, owners, events });
 */
export function trackPlaybackInitiated<S extends PlaybackInitiatedState, O extends PlaybackInitiatedOwners>({
  state,
  owners,
  events,
}: {
  state: Signal<S>;
  owners: Signal<O>;
  events: EventStream<PresentationAction>;
}): () => void {
  const presentationUrl = computed(() => state.get().presentation?.url);
  const mediaElement = computed(() => owners.get().mediaElement);

  // Version counter pair encoding merge-of-two-streams semantics.
  // resetVersion bumps on every false-stream trigger (URL change, element swap).
  // playVersion is set to the current resetVersion when play fires.
  // playbackInitiated is true iff play happened at or after the last reset.
  let resetCount = 0;
  const resetVersion = signal(0);
  const playVersion = signal(-1);

  const playbackInitiated = computed(() => playVersion.get() >= resetVersion.get());

  // False stream: bump resetVersion on URL change or element swap.
  const cleanupResetEffect = effect(() => {
    presentationUrl.get();
    mediaElement.get();
    resetVersion.set(++resetCount);
  });

  // True stream: set playVersion to current resetVersion when play fires.
  // Reading resetVersion.get() inside the listener is safe — event callbacks
  // run outside the effect's tracking context, so no dependency is created.
  const cleanupPlayEffect = effect(() => {
    const el = mediaElement.get();
    if (!el) return;
    return listen(el, 'play', () => {
      playVersion.set(resetVersion.get());
      // TODO: remove once resolvePresentation migrates to signals
      events.dispatch({ type: 'play' });
    });
  });

  // Bridge: signal graph → state.
  // playbackInitiated starts false (playVersion=-1 < resetVersion=1 after init).
  // The merge effect only runs on genuine false→true or true→false transitions,
  // so no spurious writes on init.
  const cleanupMergeEffect = effect(() => {
    const pi = playbackInitiated.get();
    const current = state.get();
    if (current.playbackInitiated !== pi) {
      state.set({ ...current, playbackInitiated: pi } as S);
    }
  });

  return () => {
    cleanupResetEffect();
    cleanupPlayEffect();
    cleanupMergeEffect();
  };
}
