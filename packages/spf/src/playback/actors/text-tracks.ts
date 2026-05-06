import type { TransitionActor } from '../../core/actors/create-transition-actor';
import type { Cue, Segment } from '../../media/types';

// =============================================================================
// Message / context shapes
// =============================================================================

/** Segment identity and timing — mirrors AppendSegmentMeta without trackId (keyed separately). */
export type CueSegmentMeta = Pick<Segment, 'id' | 'startTime' | 'duration'> & { trackId: string };

/** Non-finite (extended) data managed by the actor — the XState "context". */
export interface TextTracksActorContext {
  /** Cues added per track ID. Used for duplicate detection and snapshot observability. */
  loaded: Record<string, Cue[]>;
  /** Segments whose cues have been fully added, keyed by track ID. Used for load planning. */
  segments: Record<string, Array<Pick<Segment, 'id' | 'startTime' | 'duration'>>>;
}

export interface AddCuesMessage<C extends Cue = Cue> {
  type: 'add-cues';
  meta: CueSegmentMeta;
  cues: C[];
}

export type TextTracksActorMessage<C extends Cue = Cue> = AddCuesMessage<C>;

/**
 * Host-agnostic text-track actor type.
 *
 * Generic over the concrete cue shape `C` so DOM hosts (using `VTTCue`)
 * and non-DOM hosts (custom cue representations) can both satisfy it.
 */
export type TextTracksActor<C extends Cue = Cue> = TransitionActor<TextTracksActorContext, TextTracksActorMessage<C>>;
