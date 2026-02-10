import { fetchResolvable, getResponseText } from '../../dom/network/fetch';
import type { EventStream } from '../events/create-event-stream';
import { parseMediaPlaylist } from '../hls/parse-media-playlist';
import { combineLatest } from '../reactive/combine-latest';
import type { WritableState } from '../state/create-state';
import type {
  AudioTrack,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedTextTrack,
  PartiallyResolvedVideoTrack,
  Presentation,
  ResolvedTrack,
  TextTrack,
  TrackType,
  VideoTrack,
} from '../types';
import { isResolvedTrack } from '../types';

/**
 * State shape for track resolution.
 */
export interface TrackResolutionState {
  presentation?: Presentation | undefined;
  selectedVideoTrackId?: string | undefined;
  selectedAudioTrackId?: string | undefined;
  selectedTextTrackId?: string | undefined;
}

const SelectedTrackIdKeyByType = {
  video: 'selectedVideoTrackId',
  audio: 'selectedAudioTrackId',
  text: 'selectedTextTrackId',
} as const;

/**
 * Get selected track from state by type.
 * Returns properly typed track (partially or fully resolved) or undefined.
 * Type parameter T is inferred from the type argument.
 */
export function getSelectedTrack<T extends TrackType>(
  state: TrackResolutionState,
  type: T
): T extends 'video'
  ? PartiallyResolvedVideoTrack | VideoTrack | undefined
  : T extends 'audio'
    ? PartiallyResolvedAudioTrack | AudioTrack | undefined
    : T extends 'text'
      ? PartiallyResolvedTextTrack | TextTrack | undefined
      : never {
  const { presentation } = state;

  if (!presentation) return undefined as any;

  // Get track ID based on type
  const trackIdKey = SelectedTrackIdKeyByType[type];
  const trackId = state[trackIdKey];
  return presentation.selectionSets
    .find(({ type: selectionSetType }) => selectionSetType === type)
    ?.switchingSets[0]?.tracks.find(({ id }) => id === trackId) as any;
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

  return combineLatest([state, events]).subscribe(async ([currentState, event]) => {
    if (!canResolve(currentState, config) || !shouldResolve(currentState, event) || resolving) return;

    try {
      // This along with the resolving finite state (or more complex) could be pulled into its own abstraction.
      // Set flag before async work
      resolving = true;
      const { presentation } = currentState;
      const track = getSelectedTrack(currentState, config.type)!;

      // Fetch and parse media playlist
      const response = await fetchResolvable(track);
      const text = await getResponseText(response);
      const mediaTrack = parseMediaPlaylist(text, track);

      // Update presentation with resolved track
      const updatedPresentation = updateTrackInPresentation(presentation!, mediaTrack);

      state.patch({ presentation: updatedPresentation });
    } finally {
      // Always clear flag
      resolving = false;
    }
  });
}
