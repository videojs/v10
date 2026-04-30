import type { TransitionActor } from '../../core/actors/create-transition-actor';
import { createTransitionActor } from '../../core/actors/create-transition-actor';
import type { Segment } from '../../media/types';

// =============================================================================
// Types
// =============================================================================

/** Minimal cue record — enough for deduplication and snapshot observability. */
export interface CueRecord {
  startTime: number;
  endTime: number;
  text: string;
}

/** Segment identity and timing — mirrors AppendSegmentMeta without trackId (keyed separately). */
export type CueSegmentMeta = Pick<Segment, 'id' | 'startTime' | 'duration'> & { trackId: string };

/** Non-finite (extended) data managed by the actor — the XState "context". */
export interface TextTracksActorContext {
  /** Cues added per track ID. Used for duplicate detection and snapshot observability. */
  loaded: Record<string, CueRecord[]>;
  /** Segments whose cues have been fully added, keyed by track ID. Used for load planning. */
  segments: Record<string, Array<Pick<Segment, 'id' | 'startTime' | 'duration'>>>;
}

export type AddCuesMessage = { type: 'add-cues'; meta: CueSegmentMeta; cues: VTTCue[] };
export type TextTracksActorMessage = AddCuesMessage;

export type TextTracksActor = TransitionActor<TextTracksActorContext, TextTracksActorMessage>;

// =============================================================================
// Helpers
// =============================================================================

function isDuplicateCue(cue: VTTCue, existing: CueRecord[]): boolean {
  return existing.some((r) => r.startTime === cue.startTime && r.endTime === cue.endTime && r.text === cue.text);
}

// =============================================================================
// Implementation
// =============================================================================

/** TextTrack actor: wraps all text tracks on a media element, owns cue operations. */
export function createTextTracksActor(mediaElement: HTMLMediaElement): TextTracksActor {
  return createTransitionActor({ loaded: {}, segments: {} } as TextTracksActorContext, (context, message) => {
    // NOTE: Currently assumes cues are applied to a non-disabled TextTrack. Discuss different approaches here, including:
    // - Making the message responsible for auto-selection of the textTrack (changes logic in sync-text-tracks)
    // - Silent gating/console warning + early bail
    // - throwing a domain-specific error
    // - accepting as is (which would result in errors, but also "shouldn't ever happen" unless a bug is introduced)
    // (CJP)
    const { meta, cues } = message;
    const { trackId, id: segmentId, startTime, duration } = meta;
    const textTrack = Array.from(mediaElement.textTracks).find((t) => t.id === trackId);
    if (!textTrack) return context;

    const existingCues = context.loaded[trackId] ?? [];
    const existingSegments = context.segments[trackId] ?? [];
    const prunedCues = cues.filter((cue) => !isDuplicateCue(cue, existingCues));
    const segmentAlreadyLoaded = existingSegments.some((s) => s.id === segmentId);

    if (prunedCues.length === 0 && segmentAlreadyLoaded) return context;

    for (const cue of prunedCues) textTrack.addCue(cue);
    return {
      ...context,
      loaded: {
        ...context.loaded,
        [trackId]: [...existingCues, ...prunedCues],
      },
      segments: segmentAlreadyLoaded
        ? context.segments
        : {
            ...context.segments,
            [trackId]: [...existingSegments, { id: segmentId, startTime, duration }],
          },
    };
  });
}
