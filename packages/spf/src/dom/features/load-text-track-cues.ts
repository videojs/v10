import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation, Segment, TextTrack } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { parseVttSegment } from '../text/parse-vtt-segment';

/**
 * State shape for text track cue loading.
 */
export interface TextTrackCueLoadingState {
  selectedTextTrackId?: string;
  presentation?: Presentation;
}

/**
 * Owners shape for text track cue loading.
 */
export interface TextTrackCueLoadingOwners {
  textTracks?: Map<string, HTMLTrackElement>;
}

/**
 * Find the selected text track in the presentation.
 */
function findSelectedTextTrack(state: TextTrackCueLoadingState): TextTrack | undefined {
  if (!state.presentation || !state.selectedTextTrackId) {
    return undefined;
  }

  const textSet = state.presentation.selectionSets.find((set) => set.type === 'text');
  if (!textSet?.switchingSets?.[0]?.tracks) {
    return undefined;
  }

  const track = textSet.switchingSets[0].tracks.find((t) => t.id === state.selectedTextTrackId);

  return track as TextTrack | undefined;
}

/**
 * Select which VTT segments to load for the current text track.
 *
 * Currently returns all segments (full track loading).
 *
 * Future enhancements:
 * - Filter based on playhead position and buffer window
 * - Skip already-loaded segments (avoid re-downloading)
 * - Handle live stream segment updates
 * - Apply timing offsets for discontinuities
 *
 * @param state - Current playback state (track selection, presentation)
 * @returns Array of segments to load, or empty array if track not ready
 */
function selectSegmentsToLoad(state: TextTrackCueLoadingState): Segment[] {
  const track = findSelectedTextTrack(state);

  if (!track || !isResolvedTrack(track)) {
    return [];
  }

  // For now: load all segments
  // TODO: Add buffering logic based on playhead position and buffer ranges
  return track.segments;
}

/**
 * Get the browser's TextTrack object for the selected text track.
 *
 * Retrieves the live TextTrack interface from the track element in owners,
 * which is used for adding cues, checking mode, and managing track state.
 *
 * Note: Returns the DOM TextTrack interface (HTMLTrackElement.track),
 * not the presentation Track metadata type.
 *
 * @param state - Current playback state (track selection)
 * @param owners - DOM owners containing track elements map
 * @returns DOM TextTrack interface or undefined if not found
 */
function getSelectedTextTrackFromOwners(
  state: TextTrackCueLoadingState,
  owners: TextTrackCueLoadingOwners
): globalThis.TextTrack | undefined {
  const trackId = state.selectedTextTrackId;
  if (!trackId || !owners.textTracks) {
    return undefined;
  }

  const trackElement = owners.textTracks.get(trackId);
  return trackElement?.track;
}

/**
 * Check if we can load text track cues.
 *
 * Requires:
 * - Selected text track ID exists
 * - Track elements map exists
 * - Track element exists for selected track
 */
export function canLoadTextTrackCues(state: TextTrackCueLoadingState, owners: TextTrackCueLoadingOwners): boolean {
  return !!state.selectedTextTrackId && !!owners.textTracks && owners.textTracks.has(state.selectedTextTrackId);
}

/**
 * Check if we should load text track cues.
 *
 * Only load if:
 * - Track is resolved (has segments)
 * - Track has at least one segment
 * - Track element has no cues yet
 */
export function shouldLoadTextTrackCues(state: TextTrackCueLoadingState, owners: TextTrackCueLoadingOwners): boolean {
  if (!canLoadTextTrackCues(state, owners)) {
    return false;
  }

  const track = findSelectedTextTrack(state);
  if (!track || !isResolvedTrack(track) || track.segments.length === 0) {
    return false;
  }

  const textTrack = getSelectedTextTrackFromOwners(state, owners);
  if (!textTrack) {
    return false;
  }

  // Already has cues? Skip (null means not loaded yet, length 0 means loaded but empty)
  if (textTrack.cues !== null && textTrack.cues.length > 0) {
    return false;
  }

  return true;
}

/**
 * Load text track cues orchestration.
 *
 * Triggers when:
 * - Text track is selected
 * - Track is resolved (has segments)
 * - Track element exists
 * - Track has no cues yet
 *
 * Fetches and parses VTT segments, then adds cues to the track incrementally.
 * Continues on segment errors to provide partial subtitles.
 *
 * @example
 * const cleanup = loadTextTrackCues({ state, owners });
 */
export function loadTextTrackCues({
  state,
  owners,
}: {
  state: WritableState<TextTrackCueLoadingState>;
  owners: WritableState<TextTrackCueLoadingOwners>;
}): () => void {
  let isLoading = false;
  let abortController: AbortController | null = null;

  const cleanup = combineLatest([state, owners]).subscribe(
    async ([s, o]: [TextTrackCueLoadingState, TextTrackCueLoadingOwners]) => {
      if (!shouldLoadTextTrackCues(s, o) || isLoading) return;

      const textTrack = getSelectedTextTrackFromOwners(s, o);
      if (!textTrack) return;

      // Determine which segments to load
      const segmentsToLoad = selectSegmentsToLoad(s);

      if (segmentsToLoad.length === 0) return;

      // Map segments to async task functions
      const tasks = segmentsToLoad.map((segment) => async () => {
        const cues = await parseVttSegment(segment.url);
        for (const cue of cues) {
          textTrack.addCue(cue);
        }
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
            // Log error but continue - partial subtitles better than none
            console.error(`Failed to load VTT segment:`, error);
          }
        }
      } finally {
        // Wait a frame before clearing flag to allow async state updates to flush
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
