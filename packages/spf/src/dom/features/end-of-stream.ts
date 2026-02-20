import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';

export interface EndOfStreamState extends TrackSelectionState {
  presentation?: Presentation;
}

export interface EndOfStreamOwners {
  mediaSource?: MediaSource;
  mediaElement?: HTMLMediaElement | undefined;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
}

/**
 * Check if a SourceBuffer has loaded all segments for its track.
 *
 * For VOD, we check if:
 * 1. Buffer has data
 * 2. Buffer starts at 0 (beginning of stream)
 * 3. Buffer is contiguous (no gaps)
 *
 * Note: We don't check duration here because duration may be slightly off
 * from actual buffered range (which is why endOfStream() exists to correct it).
 */
function hasLoadedAllSegments(
  buffer: SourceBuffer | undefined,
  segmentCount: number,
  expectedDuration?: number
): boolean {
  // If no segments to load, consider it complete
  if (segmentCount === 0) return true;

  // If buffer doesn't exist, segments are not loaded
  if (!buffer) return false;

  const { buffered } = buffer;
  if (buffered.length === 0) return false;

  // Must have contiguous buffer from start
  if (buffered.start(0) !== 0) return false;

  // For a complete VOD stream, we expect a single contiguous buffered range
  // If we have gaps, segments are still loading
  if (buffered.length > 1) return false;

  // If we have expected duration, check if we're close (within 1 second tolerance)
  // This handles the case where actual media duration differs from playlist
  if (expectedDuration !== undefined) {
    const bufferedEnd = buffered.end(0);
    const tolerance = 1; // 1 second tolerance
    return Math.abs(bufferedEnd - expectedDuration) < tolerance;
  }

  // Fallback: just check that we have data from 0
  return true;
}

/**
 * Check if all tracks have finished loading segments.
 */
export function areAllTracksLoaded(state: EndOfStreamState, owners: EndOfStreamOwners): boolean {
  const videoTrack = state.selectedVideoTrackId ? getSelectedTrack(state, 'video') : undefined;
  const audioTrack = state.selectedAudioTrackId ? getSelectedTrack(state, 'audio') : undefined;

  const { presentation } = state;
  const expectedDuration = presentation?.duration;

  // Check video track (if present)
  if (videoTrack && isResolvedTrack(videoTrack)) {
    const videoLoaded = hasLoadedAllSegments(owners.videoBuffer, videoTrack.segments.length, expectedDuration);
    if (!videoLoaded) return false;
  }

  // Check audio track (if present)
  if (audioTrack && isResolvedTrack(audioTrack)) {
    const audioLoaded = hasLoadedAllSegments(owners.audioBuffer, audioTrack.segments.length, expectedDuration);
    if (!audioLoaded) return false;
  }

  return true;
}

/**
 * Check if we can call endOfStream.
 */
export function canEndStream(state: EndOfStreamState, owners: EndOfStreamOwners): boolean {
  return !!(owners.mediaSource && state.presentation);
}

/**
 * Check if we should call endOfStream.
 */
export function shouldEndStream(state: EndOfStreamState, owners: EndOfStreamOwners): boolean {
  if (!canEndStream(state, owners)) return false;

  const { mediaSource, mediaElement } = owners;

  // MediaSource must be open
  if (mediaSource!.readyState !== 'open') return false;

  // CRITICAL: MediaElement must have metadata before calling endOfStream
  // Calling endOfStream before HAVE_METADATA causes DEMUXER_ERROR
  // https://github.com/chromium/chromium/blob/main/media/filters/chunk_demuxer.cc
  if (mediaElement && mediaElement.readyState < HTMLMediaElement.HAVE_METADATA) {
    return false;
  }

  // SourceBuffers must exist for selected tracks before we can end the stream
  // (otherwise we'd close the MediaSource before SourceBuffers are created)
  const hasVideoTrack = !!state.selectedVideoTrackId;
  const hasAudioTrack = !!state.selectedAudioTrackId;

  if (hasVideoTrack && !owners.videoBuffer) return false;
  if (hasAudioTrack && !owners.audioBuffer) return false;

  // All tracks must have loaded their segments
  if (!areAllTracksLoaded(state, owners)) return false;

  return true;
}

/**
 * End of stream task (module-level, pure).
 * Calls MediaSource.endOfStream() to signal stream completion.
 */
const endOfStreamTask = async (
  { currentOwners }: { currentOwners: EndOfStreamOwners },
  _context: {}
): Promise<void> => {
  const { mediaSource } = currentOwners;

  // Double-check MediaSource isn't already ended (in case of race)
  if (mediaSource!.readyState === 'ended') {
    return;
  }

  mediaSource!.endOfStream();

  // Wait a frame to allow async state updates to flush
  await new Promise((resolve) => requestAnimationFrame(resolve));
};

/**
 * Call endOfStream when all segments are loaded.
 * This signals to the browser that the stream is complete.
 */
export function endOfStream({
  state,
  owners,
}: {
  state: WritableState<EndOfStreamState>;
  owners: WritableState<EndOfStreamOwners>;
}): () => void {
  let hasEnded = false;

  return combineLatest([state, owners]).subscribe(
    async ([currentState, currentOwners]: [EndOfStreamState, EndOfStreamOwners]) => {
      if (hasEnded) return; // Only call once
      if (!shouldEndStream(currentState, currentOwners)) return;

      try {
        await endOfStreamTask({ currentOwners }, {});
        hasEnded = true;
      } catch (error) {
        console.error('Failed to call endOfStream:', error);
        // Still set flag to prevent retry on error
        hasEnded = true;
      }
    }
  );
}
