import { listen } from '@videojs/utils/dom';
import { effect } from '../../core/signals/effect';
import { computed, type Signal, signal, update } from '../../core/signals/primitives';

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
 * Uses a local intermediate signal written by two effect streams:
 * - false stream: resets on URL change
 * - true stream: sets on play event
 *
 * A third merge effect reads the local signal and writes to state, reading
 * `state.get()` at merge time so the spread uses the up-to-date value after
 * the async forward bridge has run.
 *
 * @example
 * const cleanup = trackPlaybackInitiated({ state, owners, events });
 */
export function trackPlaybackInitiated<S extends PlaybackInitiatedState, O extends PlaybackInitiatedOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void {
  const presentationUrl = computed(() => state.get().presentation?.url);
  const mediaElement = computed(() => owners.get().mediaElement);

  // Local signal: written by the URL effect (false) and the play listener (true).
  // undefined = not yet initialized (suppresses the merge effect on startup).
  const playbackInitiated = signal<boolean | undefined>(undefined);

  let lastPresentationUrl: string | undefined;
  let lastMediaElement: HTMLMediaElement | undefined;

  // False stream: reset on URL change or element swap.
  const cleanupResetEffect = effect(() => {
    const url = presentationUrl.get();
    const el = mediaElement.get();

    const urlChanged = url !== lastPresentationUrl;
    const elChanged = el !== lastMediaElement;

    if ((urlChanged && lastPresentationUrl !== undefined) || (elChanged && lastMediaElement !== undefined)) {
      playbackInitiated.set(false);
    }

    lastPresentationUrl = url;
    lastMediaElement = el;
  });

  // True stream: set on play event. Cleanup return removes the listener on element swap.
  const cleanupPlayEffect = effect(() => {
    const el = mediaElement.get();
    if (!el) return;
    return listen(el, 'play', () => {
      playbackInitiated.set(true);
    });
  });

  // Merge effect: bridge local signal → state.
  // Reads state.get() at merge time (after the async forward bridge has flushed)
  // so the spread captures the current value rather than a stale event-time snapshot.
  // The guard makes the write idempotent.
  const cleanupMergeEffect = effect(() => {
    const pi = playbackInitiated.get();
    if (pi === undefined) return;
    const current = state.get();
    if (current.playbackInitiated !== pi) update(state, { playbackInitiated: pi });
  });

  return () => {
    cleanupResetEffect();
    cleanupPlayEffect();
    cleanupMergeEffect();
  };
}
