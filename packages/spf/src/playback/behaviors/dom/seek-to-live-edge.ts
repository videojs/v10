/**
 * Enter the live window: declare the seekable range and seek the playhead in.
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
 *
 * Reads the *selected video track* timeline (anchored to ≈ native PTS by
 * `anchorLiveTracks`); video and audio share the origin, so the video window
 * positions both. Seeks once per source; re-declares the seekable range on
 * each window change.
 */
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

export interface SeekToLiveEdgeState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
}

export interface SeekToLiveEdgeContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
}

function seekToLiveEdgeSetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<SeekToLiveEdgeState['presentation']>;
    selectedVideoTrackId?: ReadonlySignal<SeekToLiveEdgeState['selectedVideoTrackId']>;
  };
  context: {
    mediaElement: ReadonlySignal<SeekToLiveEdgeContext['mediaElement']>;
    mediaSource: ReadonlySignal<SeekToLiveEdgeContext['mediaSource']>;
  };
}): () => void {
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
    // This is the liveness guard that keeps the behavior inert in the unified
    // engine: a VoD source never declares a live seekable range or seeks.
    if (getMediaPlaylistMetadata(track)?.endList) return;

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

    // Seek to the live edge once, so the loader dispatches an in-window range.
    if (!seeked && mediaElement.currentTime < liveEdgeStart) {
      mediaElement.currentTime = liveEdgeStart;
      seeked = true;
    }
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
  object
> = {
  stateKeys: ['presentation'],
  contextKeys: ['mediaElement', 'mediaSource'],
  setup: seekToLiveEdgeSetup,
};
