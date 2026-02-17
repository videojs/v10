import { fetchResolvable, getResponseText } from '../../dom/network/fetch';
import type { EventStream } from '../events/create-event-stream';
import { parseMediaPlaylist } from '../hls/parse-media-playlist';
import { combineLatest } from '../reactive/combine-latest';
import type { WritableState } from '../state/create-state';
import type { Presentation, ResolvedTrack, TrackType } from '../types';
import { isResolvedTrack } from '../types';
import { getSelectedTrack, type TrackSelectionState } from '../utils/track-selection';

/**
 * State shape for track resolution.
 */
export interface TrackResolutionState extends TrackSelectionState {
  presentation?: Presentation | undefined;
  selectedVideoTrackId?: string | undefined;
  selectedAudioTrackId?: string | undefined;
  selectedTextTrackId?: string | undefined;
}

export function canResolve<T extends TrackType>(
  state: TrackResolutionState,
  config: TrackResolutionConfig<T>
): boolean {
  const track = getSelectedTrack(state, config.type);
  if (!track) return false;

  return !isResolvedTrack(track);
}

/**
 * Determines if track resolution conditions are met.
 *
 * Currently always returns true - conditions are checked by canResolveTrack()
 * and resolving flag. Kept as placeholder for future conditional logic.
 *
 * @param state - Current track resolution state
 * @param event - Current action/event
 * @returns true (conditions checked elsewhere)
 */
export function shouldResolve(_state: TrackResolutionState, _event: TrackResolutionAction): boolean {
  return true;
}

/**
 * Updates a track within a presentation (immutably).
 * Generic - works for video, audio, or text tracks.
 */
export function updateTrackInPresentation<T extends ResolvedTrack>(
  presentation: Presentation,
  resolvedTrack: T
): Presentation {
  const trackId = resolvedTrack.id;
  return {
    ...presentation,
    selectionSets: presentation.selectionSets.map((selectionSet) => ({
      ...selectionSet,
      switchingSets: selectionSet.switchingSets.map((switchingSet) => ({
        ...switchingSet,
        tracks: switchingSet.tracks.map((track) => (track.id === trackId ? resolvedTrack : track)),
      })),
    })),
  } as Presentation;
}

/**
 * Action types for track resolution.
 * Event names match HTMLMediaElement events (lowercase).
 */
export type TrackResolutionAction = { type: 'play' } | { type: 'pause' };

/**
 * Configuration for track resolution.
 */
export interface TrackResolutionConfig<T extends TrackType = TrackType> {
  type: T;
}

/**
 * Resolves unresolved tracks using reactive composition.
 *
 * Uses combineLatest to compose state + events, enabling both state-driven
 * and event-driven resolution triggers.
 *
 * Generic version that works for video, audio, or text tracks based on config.
 * Type parameter T is inferred from config.type (use 'as const' for inference).
 */
export function resolveTrack<T extends TrackType>(
  {
    state,
    events,
  }: {
    state: WritableState<TrackResolutionState>;
    events: EventStream<TrackResolutionAction>;
  },
  config: TrackResolutionConfig<T>
): () => void {
  // This is effectively a very simple finite state model. We can formalize this if needed.
  let resolving = false;
  let abortController: AbortController | null = null;

  const cleanup = combineLatest([state, events]).subscribe(async ([currentState, event]) => {
    if (!canResolve(currentState, config) || !shouldResolve(currentState, event) || resolving) return;

    try {
      // This along with the resolving finite state (or more complex) could be pulled into its own abstraction.
      // Set flag before async work
      resolving = true;
      abortController = new AbortController();

      const { presentation } = currentState;
      const track = getSelectedTrack(currentState, config.type)!;

      // Fetch and parse media playlist
      const response = await fetchResolvable(track, { signal: abortController.signal });
      const text = await getResponseText(response);
      const mediaTrack = parseMediaPlaylist(text, track);

      // Update presentation with resolved track
      const updatedPresentation = updateTrackInPresentation(presentation!, mediaTrack);

      state.patch({ presentation: updatedPresentation });
    } catch (error) {
      // Ignore AbortError - this is expected when cleanup happens
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      throw error;
    } finally {
      // Always clear flag
      resolving = false;
      abortController = null;
    }
  });

  // Return cleanup function that aborts pending fetches
  return () => {
    abortController?.abort();
    cleanup();
  };
}
