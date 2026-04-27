import { type Signal } from '../../../core/signals/primitives';
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
  mediaElement?: HTMLMediaElement | undefined;
}
/**
 * Check if we can track current time.
 *
 * Requires:
 * - mediaElement exists in owners
 */
export declare function canTrackCurrentTime(owners: CurrentTimeOwners): boolean;
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
export declare function trackCurrentTime<S extends CurrentTimeState, O extends CurrentTimeOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void;
//# sourceMappingURL=track-current-time.d.ts.map
