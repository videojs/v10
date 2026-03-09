import { getSegmentsToLoad } from '../../core/buffer/forward-buffer';
import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation, Segment, TextTrack } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { parseVttSegment } from '../text/parse-vtt-segment';

function isDuplicateCue(cue: VTTCue, textTrack: globalThis.TextTrack): boolean {
  const { cues } = textTrack;
  if (!cues) return false;
  for (let i = 0; i < cues.length; i++) {
    const existing = cues[i] as VTTCue;
    if (existing.startTime === cue.startTime && existing.endTime === cue.endTime && existing.text === cue.text) {
      return true;
    }
  }
  return false;
}

const loadVttSegmentTask = async (
  { segment }: { segment: Segment },
  context: { textTrack: globalThis.TextTrack }
): Promise<void> => {
  const cues = await parseVttSegment(segment.url);
  for (const cue of cues) {
    if (!isDuplicateCue(cue, context.textTrack)) {
      context.textTrack.addCue(cue);
    }
  }
};

// ============================================================================
// MAIN TASK (composite - orchestrates subtasks)
// ============================================================================

/**
 * Load text track cues task (composite - orchestrates VTT segment subtasks).
 */
const loadTextTrackCuesTask = async (
  { currentState }: { currentState: TextTrackCueLoadingState },
  context: {
    signal: AbortSignal;
    textTrack: globalThis.TextTrack;
    state: WritableState<TextTrackCueLoadingState>;
  }
): Promise<void> => {
  const track = findSelectedTextTrack(currentState);
  if (!track || !isResolvedTrack(track)) return;

  const { segments } = track;
  if (segments.length === 0) return;

  const trackId = track.id;

  // Resolve segments already recorded in the state model for this track.
  // Keyed by track ID so multiple text tracks don't interfere with each other.
  const loadedIds = new Set((currentState.textBufferState?.[trackId]?.segments ?? []).map((s) => s.id));
  const alreadyLoaded = segments.filter((s) => loadedIds.has(s.id));

  // Apply the same forward buffer window as audio/video segment loading.
  const currentTime = currentState.currentTime ?? 0;
  const segmentsToLoad = getSegmentsToLoad(segments, alreadyLoaded, currentTime).filter((s) => !loadedIds.has(s.id));

  if (segmentsToLoad.length === 0) return;

  // Execute subtasks sequentially, recording each loaded segment in state.
  for (const segment of segmentsToLoad) {
    if (context.signal.aborted) break;

    try {
      await loadVttSegmentTask({ segment }, { textTrack: context.textTrack });

      // Record the loaded segment in shared state — mirrors bufferState for
      // audio/video and supports N text tracks keyed by track ID.
      const latest = context.state.current.textBufferState ?? {};
      const trackState = latest[trackId] ?? { segments: [] };
      context.state.patch({
        textBufferState: {
          ...latest,
          [trackId]: { segments: [...trackState.segments, { id: segment.id }] },
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') break;
      console.error('Failed to load VTT segment:', error);
      // Continue to next segment (graceful degradation)
    }
  }

  // Wait a frame before completing to allow state updates to flush
  await new Promise((resolve) => requestAnimationFrame(resolve));
};

// ============================================================================
// STATE & OWNERS
// ============================================================================

/**
 * Loaded-segment record for a single text track.
 */
export interface TextTrackSegmentState {
  segments: Array<{ id: string }>;
}

/**
 * Buffer model for text track cues — keyed by track ID.
 *
 * Using a per-track-ID map (rather than fixed 'video'/'audio' keys) because
 * there can be N text tracks — one per language/subtitle variant.
 */
export type TextTrackBufferState = Record<string, TextTrackSegmentState>;

/**
 * State shape for text track cue loading.
 */
export interface TextTrackCueLoadingState {
  selectedTextTrackId?: string;
  presentation?: Presentation;
  /** Current playback position — used to gate VTT segment fetching to the forward buffer window. */
  currentTime?: number;
  /** Loaded-segment model for text tracks, keyed by track ID. */
  textBufferState?: TextTrackBufferState;
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
 * - Track element exists
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

  return true;
}

/**
 * Load text track cues orchestration.
 *
 * Triggers when:
 * - Text track is selected
 * - Track is resolved (has segments)
 * - Track element exists
 *
 * Fetches and parses VTT segments within the forward buffer window, then adds
 * cues to the track incrementally. Continues on segment errors to provide
 * partial subtitles.
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
  let currentTask: Promise<void> | null = null;
  let abortController: AbortController | null = null;
  let lastTrackId: string | undefined;

  const cleanup = combineLatest([state, owners]).subscribe(
    async ([currentState, currentOwners]: [TextTrackCueLoadingState, TextTrackCueLoadingOwners]) => {
      // Abort any in-progress task when the selected track changes.
      // The new track's textBufferState entry will be empty, so the task
      // naturally starts fresh without needing any explicit reset.
      if (currentState.selectedTextTrackId !== lastTrackId) {
        lastTrackId = currentState.selectedTextTrackId;
        abortController?.abort();
        currentTask = null;
      }

      if (currentTask) return; // Task already in progress
      if (!shouldLoadTextTrackCues(currentState, currentOwners)) return;

      const textTrack = getSelectedTextTrackFromOwners(currentState, currentOwners);
      if (!textTrack) return;

      // Create abort controller and invoke task
      abortController = new AbortController();
      currentTask = loadTextTrackCuesTask(
        { currentState },
        { signal: abortController.signal, textTrack, state }
      ).finally(() => {
        currentTask = null;
      });
    }
  );

  return cleanup;
}
