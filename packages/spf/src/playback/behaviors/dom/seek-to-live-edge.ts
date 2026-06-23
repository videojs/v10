/**
 * Seek the playhead into the live window and keep it there:
 *
 * 1. A one-time seek of `currentTime` to HOLD-BACK behind the live edge
 *    (default 3 × TARGETDURATION, clamped to the window start) so playback
 *    begins near the edge and the segment loader dispatches an in-window range
 *    rather than starting at the back of the DVR window.
 * 2. A live-window playhead guard: while playing (`!paused && !seeking &&
 *    readyState > 0`), reposition `currentTime` to the live edge when it falls
 *    *outside* the sliding window — a paused playhead the window slid past
 *    (caught on the `playing` resume) or playback that fell behind on poor
 *    network (caught on this effect's window-update re-fire, since `timeupdate`
 *    stops once a stall freezes `currentTime`). In-window pause and DVR
 *    scrub-back are left untouched (the `window-exit` reposition policy).
 *
 * The live window comes from `liveWindowFromState` (the shared derivation —
 * video track when present, else audio); this behavior is inert when it returns
 * `null` (VoD / ended live). Declaring the
 * seekable range is a separate concern — see `sync-live-seekable-range`, which
 * is composed *before* this behavior so the range exists before we seek into
 * it (a seek outside `seekable` is clamped). The `mediaSource` open-gate here
 * is the read that ties the seek to that declared range being available.
 */
import { listen } from '@videojs/utils/dom';
import type { Behavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import type { ReadonlySignal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';
import { liveWindowFromState } from '../../primitives/live-window';

/**
 * Multiple of TARGETDURATION to start behind the live edge — the HLS spec
 * default for HOLD-BACK when the playlist doesn't specify one (RFC 8216bis).
 */
const HOLD_BACK_TARGET_MULTIPLIER = 3;

/**
 * Tolerance (seconds) around the window edges before the guard repositions, so
 * boundary / floating-point noise doesn't trigger a spurious seek.
 */
const REPOSITION_TOLERANCE = 0.1;

/**
 * When the live-window guard repositions the playhead to the live edge.
 * - `'window-exit'` (default; DVR model): only when the playhead is outside the
 *   sliding window. In-window pause / scrub-back is left untouched.
 * - `'on-resume'`: edge-only — always snap to the live edge on resume. A future
 *   use-case variant (live-edge-only mode); not yet implemented.
 */
export type LiveRepositionPolicy = 'window-exit' | 'on-resume';

export interface SeekToLiveEdgeState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

export interface SeekToLiveEdgeContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
}

export interface SeekToLiveEdgeConfig {
  /** Reposition policy for the live-window guard. Defaults to `'window-exit'`. */
  repositionPolicy?: LiveRepositionPolicy;
}

function seekToLiveEdgeSetup({
  state,
  context,
  config,
}: {
  state: {
    presentation: ReadonlySignal<SeekToLiveEdgeState['presentation']>;
    selectedVideoTrackId?: ReadonlySignal<SeekToLiveEdgeState['selectedVideoTrackId']>;
    selectedAudioTrackId?: ReadonlySignal<SeekToLiveEdgeState['selectedAudioTrackId']>;
  };
  context: {
    mediaElement: ReadonlySignal<SeekToLiveEdgeContext['mediaElement']>;
    mediaSource: ReadonlySignal<SeekToLiveEdgeContext['mediaSource']>;
  };
  config?: SeekToLiveEdgeConfig;
}): () => void {
  const repositionPolicy = config?.repositionPolicy ?? 'window-exit';
  let seeked = false;

  return effect(() => {
    const mediaElement = context.mediaElement.get();
    const mediaSource = context.mediaSource.get();
    const liveWindow = liveWindowFromState(state);
    if (!mediaElement || !liveWindow) return;
    // Gate on the seekable range being declarable/declared (see file JSDoc):
    // sync-live-seekable-range runs first while open, so seeks land in-window.
    if (!mediaSource || mediaSource.readyState !== 'open') return;

    const { start: windowStart, end: windowEnd, targetDuration } = liveWindow;
    const liveEdgeStart = Math.max(windowStart, windowEnd - HOLD_BACK_TARGET_MULTIPLIER * targetDuration);

    // Initial entry: seek into the window once — even while paused — so the
    // loader dispatches an in-window range and preload shows the right frame.
    // Latched so a later reload never re-yanks a paused user who scrubbed back.
    if (!seeked && mediaElement.currentTime < liveEdgeStart) {
      mediaElement.currentTime = liveEdgeStart;
      seeked = true;
    }

    // Live-window playhead guard. Repositions to the live edge when the playhead
    // falls outside the sliding window while playing. Runs now (this effect
    // re-fires on each window-update / reload — the primary trigger, since
    // `timeupdate` stops while a stall freezes `currentTime`) and on the
    // secondary media-event triggers below.
    const guard = () => {
      // `on-resume` (edge-only) is a future use-case variant; only the DVR
      // `window-exit` policy is implemented today.
      if (repositionPolicy !== 'window-exit') return;
      if (mediaElement.paused || mediaElement.seeking || mediaElement.readyState === 0) return;
      const { currentTime } = mediaElement;
      if (currentTime < windowStart - REPOSITION_TOLERANCE || currentTime > windowEnd + REPOSITION_TOLERANCE) {
        mediaElement.currentTime = liveEdgeStart;
      }
    };
    guard();
    const removePlaying = listen(mediaElement, 'playing', guard);
    const removeTimeupdate = listen(mediaElement, 'timeupdate', guard);
    const removeSeeked = listen(mediaElement, 'seeked', guard);
    return () => {
      removePlaying();
      removeTimeupdate();
      removeSeeked();
    };
  });
}

/**
 * Manual `Behavior<>` literal (like `anchorLiveTracks` /
 * `calculatePresentationDuration`): declares only `presentation` in stateKeys
 * while reading `selectedVideoTrackId` defensively (contributed by
 * `switchVideoTrack`), so it composes without a stateKeys/type conflict.
 */
export const seekToLiveEdge: Behavior<
  { presentation: ReadonlySignal<SeekToLiveEdgeState['presentation']> },
  {
    mediaElement: ReadonlySignal<SeekToLiveEdgeContext['mediaElement']>;
    mediaSource: ReadonlySignal<SeekToLiveEdgeContext['mediaSource']>;
  },
  SeekToLiveEdgeConfig
> = {
  stateKeys: ['presentation'],
  contextKeys: ['mediaElement', 'mediaSource'],
  setup: seekToLiveEdgeSetup,
};
