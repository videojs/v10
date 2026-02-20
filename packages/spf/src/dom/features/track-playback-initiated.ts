import { listen } from '@videojs/utils/dom';
import type { EventStream } from '../../core/events/create-event-stream';
import type { PresentationAction } from '../../core/features/resolve-presentation';
import type { WritableState } from '../../core/state/create-state';

/**
 * State shape for playback initiation tracking.
 */
export interface PlaybackInitiatedState {
  /** True once the user has initiated playback (play event fired). */
  playbackInitiated?: boolean;
  /** Current presentation — watched for URL changes to reset playbackInitiated. */
  presentation?: { url?: string };
}

/**
 * Owners shape for playback initiation tracking.
 */
export interface PlaybackInitiatedOwners {
  mediaElement?: HTMLMediaElement | undefined;
}

/**
 * Track whether playback has been initiated by the user.
 *
 * Sets `state.playbackInitiated = true` when the media element fires a `play`
 * event (via `element.play()`, native controls, or autoplay) and simultaneously
 * dispatches `{ type: 'play' }` to the event stream so `resolvePresentation`
 * can react.
 *
 * Resets `state.playbackInitiated = false` when `presentation.url` changes,
 * so a new source with `preload="none"` won't load segments until play is
 * triggered again.
 *
 * This flag is used by `shouldLoadSegments` to allow segment loading after
 * play is initiated regardless of the initial `preload` setting — `preload`
 * is a startup hint, not a runtime gate.
 *
 * @example
 * const cleanup = trackPlaybackInitiated({ state, owners, events });
 */
export function trackPlaybackInitiated({
  state,
  owners,
  events,
}: {
  state: WritableState<PlaybackInitiatedState>;
  owners: WritableState<PlaybackInitiatedOwners>;
  events: EventStream<PresentationAction>;
}): () => void {
  let lastMediaElement: HTMLMediaElement | undefined;
  let removeListener: (() => void) | null = null;
  let lastPresentationUrl: string | undefined;

  // Watch for presentation URL changes to reset playbackInitiated
  const unsubscribeState = state.subscribe((currentState) => {
    const url = currentState.presentation?.url;
    if (url !== lastPresentationUrl) {
      if (lastPresentationUrl !== undefined) {
        // URL changed to a new value — reset so new source requires play again
        state.patch({ playbackInitiated: false });
      }
      lastPresentationUrl = url;
    }
  });

  // Bridge media element play event → state flag + event stream
  const unsubscribeOwners = owners.subscribe((currentOwners) => {
    const { mediaElement } = currentOwners;

    if (mediaElement === lastMediaElement) return;

    removeListener?.();
    removeListener = null;
    lastMediaElement = mediaElement;

    if (!mediaElement) return;

    removeListener = listen(mediaElement, 'play', () => {
      state.patch({ playbackInitiated: true });
      events.dispatch({ type: 'play' });
    });
  });

  return () => {
    removeListener?.();
    unsubscribeState();
    unsubscribeOwners();
  };
}
