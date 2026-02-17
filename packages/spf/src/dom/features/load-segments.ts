import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation, Segment, VideoTrack } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { appendSegment } from '../media/append-segment';
import { fetchResolvable } from '../network/fetch';

/**
 * State shape for segment loading.
 */
export interface SegmentLoadingState {
  selectedVideoTrackId?: string;
  presentation?: Presentation;
}

/**
 * Owners shape for segment loading.
 */
export interface SegmentLoadingOwners {
  videoBuffer?: SourceBuffer;
}

/**
 * Find the selected video track in the presentation.
 */
function findSelectedVideoTrack(state: SegmentLoadingState): VideoTrack | undefined {
  if (!state.presentation || !state.selectedVideoTrackId) {
    return undefined;
  }

  const videoSet = state.presentation.selectionSets.find((set) => set.type === 'video');
  if (!videoSet?.switchingSets?.[0]?.tracks) {
    return undefined;
  }

  const track = videoSet.switchingSets[0].tracks.find((t) => t.id === state.selectedVideoTrackId);

  return track as VideoTrack | undefined;
}

/**
 * Select which segments to load for the current video track.
 *
 * Currently returns all segments (full track loading).
 *
 * Future enhancements:
 * - Filter based on playhead position and buffer ranges
 * - Skip already-loaded segments
 * - Handle live stream segment updates
 * - Apply timing offsets for discontinuities
 *
 * @param state - Current playback state (track selection, presentation)
 * @returns Array of segments to load, or empty array if track not ready
 */
function selectSegmentsToLoad(state: SegmentLoadingState): Segment[] {
  const track = findSelectedVideoTrack(state);

  if (!track || !isResolvedTrack(track)) {
    return [];
  }

  // For now: load all segments
  // TODO: Add buffering logic based on playhead position and buffer ranges
  return track.segments;
}

/**
 * Check if we can load segments.
 *
 * Requires:
 * - Selected video track ID exists
 * - VideoSourceBuffer exists
 */
export function canLoadSegments(state: SegmentLoadingState, owners: SegmentLoadingOwners): boolean {
  return !!state.selectedVideoTrackId && !!owners.videoBuffer;
}

/**
 * Check if we should load segments.
 *
 * Only load if:
 * - Track is resolved (has segments)
 * - Track has at least one segment
 * - SourceBuffer is not already buffered (simple check for POC)
 */
export function shouldLoadSegments(state: SegmentLoadingState, owners: SegmentLoadingOwners): boolean {
  if (!canLoadSegments(state, owners)) {
    return false;
  }

  const track = findSelectedVideoTrack(state);
  if (!track || !isResolvedTrack(track) || track.segments.length === 0) {
    return false;
  }

  // For POC: simple check - if SourceBuffer has any buffered data, skip
  // TODO: More sophisticated buffering logic (check ranges, append new segments only)
  const sourceBuffer = owners.videoBuffer;
  if (sourceBuffer && sourceBuffer.buffered.length > 0) {
    return false;
  }

  return true;
}

/**
 * Load segments orchestration (F4 + P11 POC).
 *
 * Triggers when:
 * - Video track is selected and resolved
 * - VideoSourceBuffer exists
 * - No segments loaded yet
 *
 * Fetches and appends segments sequentially.
 * Continues on segment errors to provide partial playback.
 *
 * @example
 * const cleanup = loadSegments({ state, owners });
 */
export function loadSegments({
  state,
  owners,
}: {
  state: WritableState<SegmentLoadingState>;
  owners: WritableState<SegmentLoadingOwners>;
}): () => void {
  let isLoading = false;
  let abortController: AbortController | null = null;

  const cleanup = combineLatest([state, owners]).subscribe(
    async ([s, o]: [SegmentLoadingState, SegmentLoadingOwners]) => {
      if (!shouldLoadSegments(s, o) || isLoading) return;

      const sourceBuffer = o.videoBuffer;
      if (!sourceBuffer) return;

      // Determine which segments to load
      const segmentsToLoad = selectSegmentsToLoad(s);

      if (segmentsToLoad.length === 0) return;

      // Map segments to async task functions
      const tasks = segmentsToLoad.map((segment) => async () => {
        // Fetch segment data
        const response = await fetchResolvable(segment);
        const segmentData = await response.arrayBuffer();

        // Append to SourceBuffer
        await appendSegment(sourceBuffer, segmentData);
      });

      // Execute tasks serially
      isLoading = true;
      abortController = new AbortController();

      try {
        for (const task of tasks) {
          try {
            // Check if aborted before each segment
            if (abortController.signal.aborted) break;
            await task();
          } catch (error) {
            // Ignore AbortError - expected during cleanup
            if (error instanceof Error && error.name === 'AbortError') {
              break;
            }
            // Log error but continue - partial video better than none
            console.error('Failed to load segment:', error);
          }
        }
      } finally {
        // Wait a frame before clearing flag to allow async state updates to flush
        // This prevents race conditions where multiple triggers fire before the flag is checked
        await new Promise((resolve) => requestAnimationFrame(resolve));
        isLoading = false;
        abortController = null;
      }
    }
  );

  // Return cleanup function that aborts pending fetches
  return () => {
    abortController?.abort();
    cleanup();
  };
}
