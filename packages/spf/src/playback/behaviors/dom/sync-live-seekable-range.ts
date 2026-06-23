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
 * Out of scope (deliberate, tracked as follow-ups): `clearLiveSeekableRange()`
 * on the live→ended transition; and dropping the defensive `duration` write
 * below once duration ownership/ordering with `updateMediaSourceDuration` (the
 * canonical, but asynchronous, duration writer) is resolved.
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

    try {
      // A live seekable range needs a set duration. `updateMediaSourceDuration`
      // is the canonical duration owner, but writes asynchronously — so guard
      // here so this doesn't race ahead of it. (Follow-up: resolve ownership.)
      if (Number.isNaN(mediaSource.duration)) mediaSource.duration = Number.POSITIVE_INFINITY;
      // Re-declared as the window slides so seekable tracks the live window
      // (the full DVR range remains seekable; seek-to-live-edge starts near the edge).
      mediaSource.setLiveSeekableRange(liveWindow.start, liveWindow.end);
    } catch {
      // readyState raced closed, or duration set rejected — retried on the next window change.
    }
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
