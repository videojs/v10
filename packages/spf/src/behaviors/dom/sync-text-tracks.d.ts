import type { Reactor } from '../../core/reactors/create-machine-reactor';
import { type Signal } from '../../core/signals/primitives';
import type { Presentation } from '../../media/types';
/**
 * FSM states for text track sync.
 *
 * ```
 * 'preconditions-unmet' ──── mediaElement + tracks available ────→ 'set-up'
 *        ↑                                                              |
 *        └──────────────── preconditions lost (exit cleanup) ──────────┘
 *
 * any state ──── destroy() ────→ 'destroying' ────→ 'destroyed'
 * ```
 */
/**
 * State shape for text track sync.
 */
export interface TextTrackSyncState {
  presentation?: Presentation | undefined;
  selectedTextTrackId?: string | undefined;
}
/**
 * Owners shape for text track sync.
 */
export interface TextTrackSyncOwners {
  mediaElement?: HTMLMediaElement | undefined;
}
/**
 * Text track sync orchestration.
 *
 * A single `always` monitor keeps the reactor in sync with preconditions.
 * `'set-up'` owns the full lifecycle of `<track>` elements:
 *
 * - **Effect 1** — creates `<track>` elements on entry; exit cleanup removes
 *   them and clears `selectedTextTrackId` on any outbound transition.
 * - **Effect 2** — owns mode sync, the Chromium settling-window guard, and
 *   the `'change'` listener that bridges DOM state back to
 *   `selectedTextTrackId`.
 *
 * @example
 * const reactor = syncTextTracks({ state, owners });
 * // later:
 * reactor.destroy();
 */
export declare function syncTextTracks<S extends TextTrackSyncState, O extends TextTrackSyncOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): Reactor<'preconditions-unmet' | 'set-up' | 'destroying' | 'destroyed'>;
//# sourceMappingURL=sync-text-tracks.d.ts.map
