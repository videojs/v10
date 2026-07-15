import type { TransitionActor } from '../../core/actors/create-transition-actor';
import type { Cue, Segment } from '../../media/types';
import type { AddCuesMessage } from '../primitives/text-track-messages';

// =============================================================================
// Message / context shapes
// =============================================================================

/** Non-finite (extended) data managed by the actor — the XState "context". */
export interface TextTracksActorContext {
  /** Cues added per track ID. Used for duplicate detection and snapshot observability. */
  loaded: Record<string, Cue[]>;
  /** Segments whose cues have been fully added, keyed by track ID. Used for load planning. */
  segments: Record<string, Array<Pick<Segment, 'id' | 'startTime' | 'duration'>>>;
}

/**
 * Wipe the actor's `loaded` + `segments` context. Sent on source reset
 * (typically by `syncTextTracks` on state exit) so a subsequent
 * presentation starts with a fresh cue+segment cache. Without this, a
 * new presentation reusing trackIds from the prior source would have
 * `getSegmentsToLoad` treat its segments as already-buffered and skip
 * loading them.
 */
export interface ClearMessage {
  type: 'clear';
}

export type TextTracksActorMessage<C extends Cue = Cue> = AddCuesMessage<C> | ClearMessage;

/**
 * Host-agnostic text-track actor type.
 *
 * Generic over the concrete cue shape `C` so DOM hosts (using `VTTCue`)
 * and non-DOM hosts (custom cue representations) can both satisfy it.
 */
export type TextTracksActor<C extends Cue = Cue> = TransitionActor<TextTracksActorContext, TextTracksActorMessage<C>>;
