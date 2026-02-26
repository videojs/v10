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
 * Resolution task function (module-level, pure).
 * Fetches and parses media playlist for a track, then updates presentation.
 */
const resolveTrackTask = async <T extends TrackType>(
  { currentState }: { currentState: TrackResolutionState },
  context: {
    signal: AbortSignal;
    state: WritableState<TrackResolutionState>;
    config: TrackResolutionConfig<T>;
  }
): Promise<void> => {
  const track = getSelectedTrack(currentState, context.config.type)!;

  // Fetch and parse media playlist
  const response = await fetchResolvable(track, { signal: context.signal });
  const text = await getResponseText(response);
  const mediaTrack = parseMediaPlaylist(text, track);

  // IMPORTANT: Do NOT use currentState.presentation here. Multiple tracks may
  // be resolving concurrently (e.g. during quality switching), so
  // currentState.presentation is the snapshot from when this task *started*
  // and is likely already stale — a concurrent task may have already patched
  // the presentation with its own resolved track. Using the stale snapshot
  // would overwrite that concurrent update and lose the other track's
  // resolution. Instead we always read state.current.presentation at patch
  // time so we build on top of whatever has been committed so far.
  //
  // This is admittedly a limitation of our current architecture: the task
  // receives a snapshot but needs live state at write time. A future
  // improvement could make updateTrackInPresentation a pure reducer dispatched
  // through a single serialised writer.
  const latestPresentation = context.state.current.presentation!;
  const updatedPresentation = updateTrackInPresentation(latestPresentation, mediaTrack);
  context.state.patch({ presentation: updatedPresentation });
};

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
 * Tracks each in-flight resolution in a Map keyed by track ID. This allows
 * multiple tracks to resolve concurrently — important for quality switching,
 * where the selected track may change before the prior resolution completes.
 * Deduplication ensures each track is fetched at most once at a time; if a
 * resolution for a given ID is already pending, subsequent requests for the
 * same ID are ignored until the first completes.
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
  // In-flight resolutions keyed by track ID.
  // Each entry is the AbortController for that fetch, allowing cleanup on destroy.
  const pending = new Map<string, AbortController>();

  const cleanup = combineLatest([state, events]).subscribe(async ([currentState, event]) => {
    if (!canResolve(currentState, config) || !shouldResolve(currentState, event)) return;

    const track = getSelectedTrack(currentState, config.type);
    if (!track) return;

    // Already resolving this track — skip to avoid duplicate fetches.
    if (pending.has(track.id)) return;

    const abortController = new AbortController();
    pending.set(track.id, abortController);

    try {
      await resolveTrackTask({ currentState }, { signal: abortController.signal, state, config });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) throw error;
    } finally {
      pending.delete(track.id);
    }
  });

  return () => {
    for (const controller of pending.values()) {
      controller.abort();
    }
    pending.clear();
    cleanup();
  };
}
