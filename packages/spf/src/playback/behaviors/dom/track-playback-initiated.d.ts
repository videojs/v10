import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { type Signal } from '../../../core/signals/primitives';
/**
 * State shape for playback initiation tracking.
 */
export interface PlaybackInitiatedState {
  /** True once play has been requested for the current presentation URL. */
  playbackInitiated?: boolean;
  /** Current presentation — URL is used to detect source changes. */
  presentation?: {
    url?: string;
  };
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
 * A three-state Reactor FSM driven by `state.playbackInitiated` and the
 * `deriveState` pattern:
 * - `'preconditions-unmet'` — no element or URL yet; no effects.
 * - `'monitoring'` — checks `!el.paused` on entry; listens for `play`.
 * - `'playback-initiated'` — tracks element and URL; exit cleanup resets
 *   `state.playbackInitiated` to `false` on any change or lost preconditions.
 *
 * @example
 * const reactor = trackPlaybackInitiated({ state, owners });
 * // later:
 * reactor.destroy();
 */
export declare function trackPlaybackInitiated<S extends PlaybackInitiatedState, O extends PlaybackInitiatedOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): Reactor<'preconditions-unmet' | 'monitoring' | 'playback-initiated' | 'destroying' | 'destroyed'>;
//# sourceMappingURL=track-playback-initiated.d.ts.map
