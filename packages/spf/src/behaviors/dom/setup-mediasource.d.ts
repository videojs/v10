import { type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import type { Presentation } from '../../media/types';
/**
 * State shape required for MediaSource setup.
 */
export interface MediaSourceState {
  presentation?: Presentation;
}
/**
 * Owners shape for MediaSource setup.
 */
export interface MediaSourceOwners {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
  /** Reactive mirror of `mediaSource.readyState` — updated via DOM events. */
  mediaSourceReadyState?: ReadonlySignal<MediaSource['readyState']>;
}
/**
 * Setup MediaSource orchestration.
 *
 * Creates and attaches MediaSource when:
 * - mediaElement exists in owners
 * - presentation.url exists in state
 *
 * Updates owners.mediaSource after successful setup.
 */
export declare function setupMediaSource<S extends MediaSourceState, O extends MediaSourceOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void;
//# sourceMappingURL=setup-mediasource.d.ts.map
