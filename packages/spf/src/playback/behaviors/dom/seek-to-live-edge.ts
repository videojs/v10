/**
 * Enter and hold the live window: declare the seekable range, seek the playhead
 * in, and reposition it to the live edge if it ever falls outside the window.
 *
 * Live segments append at their native PTS, so the buffered window sits at a
 * large timestamp while `currentTime` starts at 0. Two problems follow, both
 * solved here from the *model* (not from `buffered`, which is empty at
 * cold-start — the segment loader only fetches segments overlapping
 * `[currentTime, currentTime + bufferDuration]`, so until the playhead is in
 * the window nothing loads):
 *
 * 1. `MediaSource.setLiveSeekableRange(windowStart, windowEnd)` — derived from
 *    the selected video track's anchored segment timeline — so the window is
 *    seekable (kept current as the window slides across reloads).
 * 2. A one-time seek of `currentTime` to HOLD-BACK behind the live edge
 *    (default 3 × TARGETDURATION, clamped to the window start), so the loader
 *    dispatches an in-window range and playback can begin near the edge rather
 *    than at the back of the DVR window.
 * 3. A live-window playhead guard: while playing, reposition `currentTime` to
 *    the live edge when it falls *outside* the sliding window — a paused
 *    playhead the window slid past (caught on the `playing` resume), or
 *    playback that fell behind on poor network (caught on this effect's
 *    window-update re-fire, since `timeupdate` stops once a stall freezes
 *    `currentTime`). In-window pause and DVR scrub-back are left untouched (the
 *    `window-exit` reposition policy — the DVR model).
 *
 * Reads the *selected video track* timeline (anchored to ≈ native PTS by
 * `anchorLiveTracks`); video and audio share the origin, so the video window
 * positions both. Seeks once per source; re-declares the seekable range on
 * each window change.
 */
import { listen } from '@videojs/utils/dom';
import type { Behavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import type { ReadonlySignal } from '../../../core/signals/primitives';
import {
  getMediaPlaylistMetadata,
  isResolvedPresentation,
  isResolvedTrack,
  type MaybeResolvedPresentation,
} from '../../../media/types';
import { findTrack } from '../../../media/utils/tracks';

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
    const presentation = state.presentation.get();
    const trackId = state.selectedVideoTrackId?.get();
    if (!mediaElement || !mediaSource || !isResolvedPresentation(presentation) || !trackId) return;
    if (mediaSource.readyState !== 'open') return;

    const track = findTrack(presentation, 'video', trackId);
    if (!track || !isResolvedTrack(track) || track.segments.length === 0) return;

    // Complete playlist (VoD, or live that has ended) → no live edge to seek to.
    // `Track.duration` is the parser's completeness signal (finite = complete,
    // Infinity = still growing / live); keeps this behavior inert for VoD in the
    // unified engine — a VoD source never declares a live seekable range or seeks.
    if (Number.isFinite(track.duration)) return;

    const { segments } = track;
    const windowStart = segments[0]!.startTime;
    const last = segments[segments.length - 1]!;
    const windowEnd = last.startTime + last.duration;

    try {
      // Live duration is unbounded; required for a live seekable range.
      if (Number.isNaN(mediaSource.duration)) mediaSource.duration = Number.POSITIVE_INFINITY;
      // Re-declared as the window slides so seekable tracks the live window
      // (the full DVR range remains seekable; we just start near the edge).
      mediaSource.setLiveSeekableRange(windowStart, windowEnd);
    } catch {
      // readyState raced closed, or duration set rejected — retried on the next window change.
      return;
    }

    // Start near the live edge: HOLD-BACK (default 3 × TARGETDURATION) behind it,
    // clamped to the window start. Closer to live than the window start, while
    // leaving enough buffered ahead to begin smoothly.
    const targetDuration = getMediaPlaylistMetadata(track)?.targetDuration || last.duration;
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
