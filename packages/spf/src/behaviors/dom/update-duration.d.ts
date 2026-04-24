import type { ReadonlySignal, Signal } from '../../core/signals/primitives';
import type { Presentation } from '../../media/types';
export interface DurationUpdateState {
  presentation?: Presentation;
}
export interface DurationUpdateOwners {
  mediaSource?: MediaSource;
  /** Reactive mirror of `mediaSource.readyState` — updated via DOM events. */
  mediaSourceReadyState?: ReadonlySignal<MediaSource['readyState']>;
  videoSourceBuffer?: SourceBuffer;
  audioSourceBuffer?: SourceBuffer;
}
/**
 * Check if we can update MediaSource duration (have required data).
 */
export declare function canUpdateDuration(state: DurationUpdateState, owners: DurationUpdateOwners): boolean;
/**
 * Get the maximum buffered end time across all SourceBuffers.
 */
export declare function getMaxBufferedEnd(owners: DurationUpdateOwners): number;
/**
 * Check if we should update MediaSource duration (conditions met).
 */
export declare function shouldUpdateDuration(state: DurationUpdateState, owners: DurationUpdateOwners): boolean;
/**
 * Update MediaSource duration when presentation duration becomes available.
 */
export declare function updateDuration<S extends DurationUpdateState, O extends DurationUpdateOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void;
//# sourceMappingURL=update-duration.d.ts.map
