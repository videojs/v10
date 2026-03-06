import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';
import type { SourceBufferActor } from '../media/source-buffer-actor';

export interface EndOfStreamState extends TrackSelectionState {
  presentation?: Presentation;
}

export interface EndOfStreamOwners {
  mediaSource?: MediaSource;
  mediaElement?: HTMLMediaElement | undefined;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
}

// ## When to call endOfStream()
//
// Per the MSE spec, endOfStream() should be called once the last media
// segments — temporally speaking — have been completely appended to all
// active SourceBuffers. Specifically it signals two things:
//   1. The temporally latest segments for both audio and video have been
//      appended (i.e. the buffer covers the end of the stream content).
//   2. The MediaSource will transition from 'open' to 'ended'. Appending
//      additional (earlier) segments after this — e.g. for a seek-back or
//      back-buffer refill — will re-open the MediaSource, at which point
//      endOfStream() must be called again once loading reaches the end.
//
// The browser uses this signal to finalise MediaSource.duration and allow
// the media element to fire the `ended` event. Without it, playback stalls
// at the end of the buffered range waiting for data that will never arrive.
//
// The "any track" qualifier is intentional: per the HLS spec, all renditions
// in a switching set are time-aligned, so the last segment of any rendition
// covers the same end-of-stream content. We don't need to be tied to the
// currently selected track.
//
// The right long-term condition is therefore:
//   - The last segment of the video content (from any resolved video track)
//     has been completely appended to the video SourceBuffer, AND
//   - The last segment of the audio content (from any resolved audio track)
//     has been completely appended to the audio SourceBuffer (when active), AND
//   - currentTime is within the time range of that last segment.
//
// The currentTime gate prevents unnecessary re-invocations when back-buffer
// refills or other mid-stream appends briefly re-open the MediaSource while
// the user is far from the end.
//
/**
 * Check if the last segment of a track has been appended to a SourceBuffer.
 *
 * Checks by segment ID rather than a pipeline flag, so it is robust across
 * quality switches (different tracks have different segment IDs) and
 * back-buffer flushes (flushed segment IDs are removed from the model).
 */
function isLastSegmentAppended(segments: readonly { id: string }[], actor: SourceBufferActor | undefined): boolean {
  if (segments.length === 0) return true;
  const lastSeg = segments[segments.length - 1];
  if (!lastSeg) return false;
  return actor?.snapshot.context.segments.some((s) => s.id === lastSeg.id) ?? false;
}

/**
 * Check if the last segment has been appended for each selected track.
 *
 * Handles video-only, audio-only, and video+audio scenarios.
 * A track with no segments (e.g. unresolved) is considered not ready.
 */
export function hasLastSegmentLoaded(state: EndOfStreamState, owners: EndOfStreamOwners): boolean {
  const videoTrack = state.selectedVideoTrackId ? getSelectedTrack(state, 'video') : undefined;
  const audioTrack = state.selectedAudioTrackId ? getSelectedTrack(state, 'audio') : undefined;

  // An unresolved track means we don't yet know its segments — cannot be done.
  // Fast-paths the quality-switch window: when selectedVideoTrackId has changed
  // to a new (unresolved) track, we cannot yet determine if its last segment
  // is loaded.
  if (videoTrack && !isResolvedTrack(videoTrack)) return false;
  if (audioTrack && !isResolvedTrack(audioTrack)) return false;

  if (videoTrack && isResolvedTrack(videoTrack)) {
    if (!isLastSegmentAppended(videoTrack.segments, owners.videoBufferActor)) return false;
  }

  if (audioTrack && isResolvedTrack(audioTrack)) {
    if (!isLastSegmentAppended(audioTrack.segments, owners.audioBufferActor)) return false;
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

  // SourceBufferActors must be idle — setting duration while a SourceBuffer is
  // updating throws InvalidStateError. The actor subscriber in endOfStream() will
  // re-evaluate when each actor transitions back to idle.
  if (owners.videoBufferActor?.snapshot.status === 'updating') return false;
  if (owners.audioBufferActor?.snapshot.status === 'updating') return false;

  // Last segment must be appended for each selected track
  if (!hasLastSegmentLoaded(state, owners)) return false;

  // currentTime must have reached the last segment. Guards against re-ending
  // the stream when a back-buffer remove() re-opens the MediaSource while the
  // user is far from the end (remove() re-opens 'ended' → 'open' per MSE spec,
  // same as appendBuffer()).
  if (mediaElement) {
    const videoTrack = hasVideoTrack ? getSelectedTrack(state, 'video') : undefined;
    const audioTrack = hasAudioTrack ? getSelectedTrack(state, 'audio') : undefined;
    const refTrack =
      videoTrack && isResolvedTrack(videoTrack)
        ? videoTrack
        : audioTrack && isResolvedTrack(audioTrack)
          ? audioTrack
          : undefined;
    if (refTrack && refTrack.segments.length > 0) {
      const lastSeg = refTrack.segments[refTrack.segments.length - 1]!;
      if (mediaElement.currentTime < lastSeg.startTime) return false;
    }
  }

  return true;
}

/**
 * Wait for all currently-updating SourceBufferActors to finish.
 * Uses actor status rather than raw SourceBuffer.updating so the wait is
 * aligned with the same abstraction that owns all buffer operations.
 */
function waitForSourceBuffersReady(owners: EndOfStreamOwners): Promise<void> {
  const updatingActors = [owners.videoBufferActor, owners.audioBufferActor].filter(
    (actor): actor is SourceBufferActor => actor !== undefined && actor.snapshot.status === 'updating'
  );

  if (updatingActors.length === 0) return Promise.resolve();

  return Promise.all(
    updatingActors.map(
      (actor) =>
        new Promise<void>((resolve) => {
          const unsub = actor.subscribe((snapshot) => {
            if (snapshot.status !== 'updating') {
              unsub();
              resolve();
            }
          });
        })
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
  const activeActorUnsubs: Array<() => void> = [];

  const runEvaluate = async () => {
    const currentState = state.current;
    const currentOwners = owners.current;
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
  };

  // Subscribe to actor snapshot changes so endOfStream re-evaluates when a
  // segment is appended (actor context updated), not just on state/owners changes.
  // Re-subscribe whenever owners changes (actors may have appeared or changed).
  const cleanupOwners = owners.subscribe((currentOwners) => {
    activeActorUnsubs.forEach((u) => u());
    activeActorUnsubs.length = 0;

    for (const actor of [currentOwners.videoBufferActor, currentOwners.audioBufferActor]) {
      if (!actor) continue;
      // Skip the immediate fire — the combineLatest subscription handles the
      // initial evaluation. Only react to subsequent snapshot changes.
      let isFirst = true;
      activeActorUnsubs.push(
        actor.subscribe(() => {
          if (isFirst) {
            isFirst = false;
            return;
          }
          runEvaluate();
        })
      );
    }
  });

  const cleanupCombineLatest = combineLatest([state, owners]).subscribe(async () => runEvaluate());

  return () => {
    activeActorUnsubs.forEach((u) => u());
    cleanupOwners();
    cleanupCombineLatest();
  };
}
