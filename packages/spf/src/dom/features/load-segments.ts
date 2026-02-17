import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation, Segment } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { BufferKeyByType, getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';
import { appendSegment } from '../media/append-segment';
import { fetchResolvable } from '../network/fetch';
import type { MediaTrackType } from './setup-sourcebuffer';

/**
 * State shape for segment loading.
 */
export interface SegmentLoadingState extends TrackSelectionState {
  presentation?: Presentation;
  preload?: string;
}

/**
 * Owners shape for segment loading.
 */
export interface SegmentLoadingOwners {
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
}

/**
 * Select which segments to load for the current track.
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
 * @param type - Track type (video or audio)
 * @returns Array of segments to load, or empty array if track not ready
 */
function selectSegmentsToLoad(state: SegmentLoadingState, type: MediaTrackType): Segment[] {
  const track = getSelectedTrack(state, type);

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
 * - Selected track ID exists
 * - SourceBuffer exists for track type
 */
export function canLoadSegments(
  state: SegmentLoadingState,
  owners: SegmentLoadingOwners,
  type: MediaTrackType
): boolean {
  const track = getSelectedTrack(state, type);
  if (!track) return false;

  const bufferKey = BufferKeyByType[type];
  const sourceBuffer = owners[bufferKey];
  return !!sourceBuffer;
}

/**
 * Check if we should load segments.
 *
 * Only load if:
 * - preload is 'auto' (metadata only loads track info, not segments)
 * - Track is resolved (has segments)
 * - Track has at least one segment
 * - SourceBuffer is not already buffered (simple check for POC)
 */
export function shouldLoadSegments(
  state: SegmentLoadingState,
  owners: SegmentLoadingOwners,
  type: MediaTrackType
): boolean {
  if (!canLoadSegments(state, owners, type)) {
    return false;
  }

  // Only load segments with preload: 'auto'
  // preload: 'metadata' should only resolve tracks, not load segments
  if (state.preload !== 'auto') {
    return false;
  }

  const track = getSelectedTrack(state, type);
  if (!track || !isResolvedTrack(track) || track.segments.length === 0) {
    return false;
  }

  // For POC: simple check - if SourceBuffer has any buffered data, skip
  // TODO: More sophisticated buffering logic (check ranges, append new segments only)
  const bufferKey = BufferKeyByType[type];
  const sourceBuffer = owners[bufferKey];
  if (sourceBuffer && sourceBuffer.buffered.length > 0) {
    return false;
  }

  return true;
}

/**
 * Load segments orchestration (F4 + P11 POC).
 *
 * Triggers when:
 * - Track is selected and resolved (video or audio)
 * - SourceBuffer exists for track type
 * - No segments loaded yet
 *
 * Fetches and appends segments sequentially:
 * 1. Initialization segment (required for fmp4)
 * 2. Media segments
 *
 * Continues on segment errors to provide partial playback.
 *
 * @example
 * const cleanup = loadSegments({ state, owners }, { type: 'video' });
 */
export function loadSegments(
  {
    state,
    owners,
  }: {
    state: WritableState<SegmentLoadingState>;
    owners: WritableState<SegmentLoadingOwners>;
  },
  config: { type: MediaTrackType }
): () => void {
  const { type } = config;
  let isLoading = false;

  const unsubscribe = combineLatest([state, owners]).subscribe(
    async ([s, o]: [SegmentLoadingState, SegmentLoadingOwners]) => {
      if (!shouldLoadSegments(s, o, type) || isLoading) return;

      const bufferKey = BufferKeyByType[type];
      const sourceBuffer = o[bufferKey];
      if (!sourceBuffer) return;

      // Determine which segments to load
      const segmentsToLoad = selectSegmentsToLoad(s, type);

      if (segmentsToLoad.length === 0) return;

      const track = getSelectedTrack(s, type);
      if (!track || !isResolvedTrack(track)) return;

      // Create task for initialization segment (must load first!)
      const initTask = async () => {
        const response = await fetchResolvable(track.initialization);
        const initData = await response.arrayBuffer();
        await appendSegment(sourceBuffer, initData);
      };

      // Create tasks for media segments
      const mediaTasks = segmentsToLoad.map((segment) => async () => {
        const response = await fetchResolvable(segment);
        const segmentData = await response.arrayBuffer();
        await appendSegment(sourceBuffer, segmentData);
      });

      // Combine: init segment first, then media segments
      const tasks = [initTask, ...mediaTasks];

      // Execute tasks serially
      isLoading = true;
      try {
        for (const task of tasks) {
          try {
            await task();
          } catch (error) {
            // Log error but continue - partial video better than none
            console.error('Failed to load segment:', error);
          }
        }
      } finally {
        // Wait a frame before clearing flag to allow async state updates to flush
        // This prevents race conditions where multiple triggers fire before the flag is checked
        await new Promise((resolve) => requestAnimationFrame(resolve));
        isLoading = false;
      }
    }
  );

  return unsubscribe;
}
