/**
 * Mirror the live window into the MediaSource's seekable range. On every
 * window update — **including while paused** (the seekable range must stay
 * current as the window slides, regardless of play state) — declare
 * `setLiveSeekableRange(start, end)` so the browser's `HTMLMediaElement.seekable`
 * reflects the live window (without it, `seekable` is empty under
 * `duration === Infinity`).
 *
 * The live window comes from `liveWindowFor` (the shared derivation); inert
 * when it returns `null` (VoD / ended live). Composed *before* `seekToLiveEdge`
 * so the range is declared before that behavior seeks the playhead into it (a
 * seek outside `seekable` is clamped).
 *
 * Duration is owned solely by `updateMediaSourceDuration`; this behavior only
 * declares the seekable range (`setLiveSeekableRange` requires only
 * `readyState === 'open'` per the W3C MSE spec, not a set `duration`). Out of
 * scope (tracked follow-up): `clearLiveSeekableRange()` on the live→ended
 * transition.
 */
import type { Behavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import type { ReadonlySignal } from '../../../core/signals/primitives';
import { liveWindowFor } from '../../../media/live-window';
import type { MaybeResolvedPresentation } from '../../../media/types';

export interface SyncLiveSeekableRangeState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
}

export interface SyncLiveSeekableRangeContext {
  mediaSource?: MediaSource;
}

function syncLiveSeekableRangeSetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<SyncLiveSeekableRangeState['presentation']>;
    selectedVideoTrackId?: ReadonlySignal<SyncLiveSeekableRangeState['selectedVideoTrackId']>;
  };
  context: {
    mediaSource: ReadonlySignal<SyncLiveSeekableRangeContext['mediaSource']>;
  };
}): () => void {
  return effect(() => {
    const mediaSource = context.mediaSource.get();
    const liveWindow = liveWindowFor(state.presentation.get(), state.selectedVideoTrackId?.get());
    if (!mediaSource || mediaSource.readyState !== 'open' || !liveWindow) return;

    // Re-declared as the window slides so seekable tracks the live window
    // (the full DVR range remains seekable; seek-to-live-edge starts near the edge).
    // No try/catch: `setLiveSeekableRange` throws only on a non-'open' readyState
    // (checked synchronously just above — no await between, so it can't change) or
    // an invalid range (`liveWindowFor` guarantees 0 ≤ start ≤ end).
    mediaSource.setLiveSeekableRange(liveWindow.start, liveWindow.end);
  });
}

/**
 * Manual `Behavior<>` literal (like `seekToLiveEdge`): declares only
 * `presentation` in stateKeys while reading `selectedVideoTrackId` defensively
 * (contributed by `switchVideoTrack`), so it composes without a
 * stateKeys/type conflict.
 */
export const syncLiveSeekableRange: Behavior<
  { presentation: ReadonlySignal<SyncLiveSeekableRangeState['presentation']> },
  { mediaSource: ReadonlySignal<SyncLiveSeekableRangeContext['mediaSource']> },
  object
> = {
  stateKeys: ['presentation'],
  contextKeys: ['mediaSource'],
  setup: syncLiveSeekableRangeSetup,
};
