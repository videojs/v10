import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';
import type { BufferState, SourceBufferState } from './load-segments';

export interface EndOfStreamState extends TrackSelectionState {
  presentation?: Presentation;
  bufferState?: BufferState;
}

export interface EndOfStreamOwners {
  mediaSource?: MediaSource;
  mediaElement?: HTMLMediaElement | undefined;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
}

/**
 * Check if the loading pipeline has completed for a track.
 *
 * Uses the `completed` flag on SourceBufferState, which is set by the
 * loadSegments orchestrator only after its run-loop exits with nothing
 * left to load AND the last segment's ID is confirmed in the model.
 * The flag is reset to false whenever a new loading run begins, so a
 * stale last-segment ID from a prior play-through cannot trigger a
 * premature endOfStream() call.
 */
function isLastSegmentAppended(
  segments: readonly { id: string }[],
  bufferState: SourceBufferState | undefined
): boolean {
  if (segments.length === 0) return true;
  return bufferState?.completed ?? false;
}

/**
 * Check if the last segment has been appended for each selected track.
 *
 * Handles video-only, audio-only, and video+audio scenarios.
 * A track with no segments (e.g. unresolved) is considered not ready.
 */
export function hasLastSegmentLoaded(state: EndOfStreamState): boolean {
  const videoTrack = state.selectedVideoTrackId ? getSelectedTrack(state, 'video') : undefined;
  const audioTrack = state.selectedAudioTrackId ? getSelectedTrack(state, 'audio') : undefined;

  if (videoTrack && isResolvedTrack(videoTrack)) {
    if (!isLastSegmentAppended(videoTrack.segments, state.bufferState?.video)) return false;
  }

  if (audioTrack && isResolvedTrack(audioTrack)) {
    if (!isLastSegmentAppended(audioTrack.segments, state.bufferState?.audio)) return false;
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

  // Last segment must be appended for each selected track
  if (!hasLastSegmentLoaded(state)) return false;

  return true;
}

/**
 * Wait for all currently-updating SourceBuffers to finish.
 * Same contract as in update-duration.ts but for EndOfStreamOwners field names.
 */
function waitForSourceBuffersReady(owners: EndOfStreamOwners): Promise<void> {
  const updating = [owners.videoBuffer, owners.audioBuffer].filter(
    (buf): buf is SourceBuffer => buf !== undefined && buf.updating
  );

  if (updating.length === 0) return Promise.resolve();

  return Promise.all(
    updating.map(
      (buf) => new Promise<void>((resolve) => buf.addEventListener('updateend', () => resolve(), { once: true }))
    )
  ).then(() => undefined);
}

/**
 * Get the highest buffered end time across all active SourceBuffers.
 * Used to set the final duration from actual container timestamps rather
 * than playlist metadata, which handles both shorter and longer cases.
 */
function getMaxBufferedEnd(owners: EndOfStreamOwners): number {
  let max = 0;
  for (const buf of [owners.videoBuffer, owners.audioBuffer]) {
    if (buf && buf.buffered.length > 0) {
      const end = buf.buffered.end(buf.buffered.length - 1);
      if (end > max) max = end;
    }
  }
  return max;
}

/**
 * End of stream task (module-level, pure).
 * Sets the final duration from actual buffered end time, then calls endOfStream().
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

  // Wait for any in-progress SourceBuffer operations to finish before calling
  // endOfStream() — the MSE spec forbids it while any buffer has updating === true.
  await waitForSourceBuffersReady(currentOwners);

  // Re-check after the async wait
  if (mediaSource!.readyState !== 'open') return;

  // Set the final duration from actual buffered container timestamps.
  // This is more accurate than the playlist-derived duration and correctly
  // handles both shorter (common with CMAF) and longer actual media durations.
  // Per MSE spec, endOfStream() will only *increase* duration if needed, so
  // setting it here first ensures the value from the buffer wins in all cases.
  const bufferedEnd = getMaxBufferedEnd(currentOwners);
  if (bufferedEnd > 0) {
    mediaSource!.duration = bufferedEnd;
  }

  mediaSource!.endOfStream();

  // Wait a frame to allow async state updates to flush
  await new Promise((resolve) => requestAnimationFrame(resolve));
};

/**
 * Call endOfStream when the last segment has been appended.
 * This signals to the browser that the stream is complete.
 *
 * Per the MSE spec, appendBuffer() remains valid after endOfStream() —
 * seeks that require re-appending earlier segments will still work.
 * What becomes blocked is calling endOfStream() again, addSourceBuffer(),
 * and MediaSource.duration updates.
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
      if (hasEnded) {
        // Per the MSE spec, calling appendBuffer() on a SourceBuffer when
        // readyState is 'ended' automatically transitions it back to 'open'.
        // This happens on seek-back after end-of-stream — allow endOfStream()
        // to be called again once the last segment is reloaded.
        if (currentOwners.mediaSource?.readyState !== 'open') return;
        hasEnded = false;
      }
      if (!shouldEndStream(currentState, currentOwners)) return;

      // Set flag before awaiting to close the re-entry window between
      // endOfStream() being called and the async task completing.
      hasEnded = true;
      try {
        await endOfStreamTask({ currentOwners }, {});
      } catch (error) {
        console.error('Failed to call endOfStream:', error);
      }
    }
  );
}
