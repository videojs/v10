import type { ActorSnapshot, SignalActor } from '../../core/actor';
import { type ReadonlySignal, signal, update } from '../../core/signals/primitives';

// =============================================================================
// Types
// =============================================================================

/** Finite (bounded) operational modes of the actor. */
export type TextTracksActorStatus = 'idle' | 'destroyed';

/** Minimal cue record — enough for deduplication and snapshot observability. */
export interface CueRecord {
  startTime: number;
  endTime: number;
  text: string;
}

/** Non-finite (extended) data managed by the actor — the XState "context". */
export interface TextTracksActorContext {
  /** Cues added per track ID. Used for duplicate detection and snapshot observability. */
  loaded: Record<string, CueRecord[]>;
  /** Segments whose cues have been fully added, keyed by track ID. Used for load planning. */
  segments: Record<string, Array<{ id: string }>>;
}

/** Complete snapshot of a TextTracksActor. */
export type TextTracksActorSnapshot = ActorSnapshot<TextTracksActorStatus, TextTracksActorContext>;

export type AddCuesMessage = { type: 'add-cues'; trackId: string; segmentId: string; cues: VTTCue[] };
export type TextTracksActorMessage = AddCuesMessage;

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
export class TextTracksActor implements SignalActor<TextTracksActorStatus, TextTracksActorContext> {
  readonly #mediaElement: HTMLMediaElement;
  readonly #snapshotSignal = signal<TextTracksActorSnapshot>({
    status: 'idle',
    context: { loaded: {}, segments: {} },
  });

  constructor(mediaElement: HTMLMediaElement) {
    this.#mediaElement = mediaElement;
  }

  get snapshot(): ReadonlySignal<TextTracksActorSnapshot> {
    return this.#snapshotSignal;
  }

  send(message: TextTracksActorMessage): void {
    if (this.#snapshotSignal.get().status === 'destroyed') return;

    // NOTE: Currently assumes cues are applied to a non-disabled TextTrack. Discuss different approaches here, including:
    // - Making the message responsible for auto-selection of the textTrack (changes logic in sync-text-tracks)
    // - Silent gating/console warning + early bail
    // - throwing a domain-specific error
    // - accepting as is (which would result in errors, but also "shouldn't ever happen" unless a bug is introduced)
    // (CJP)
    const { trackId, segmentId, cues } = message;
    const textTrack = Array.from(this.#mediaElement.textTracks).find((t) => t.id === trackId);
    if (!textTrack) return;

    const ctx = this.#snapshotSignal.get().context;
    const existingCues = ctx.loaded[trackId] ?? [];
    const existingSegments = ctx.segments[trackId] ?? [];
    const prunedCues = cues.filter((cue) => !isDuplicateCue(cue, existingCues));
    const segmentAlreadyLoaded = existingSegments.some((s) => s.id === segmentId);

    if (prunedCues.length === 0 && segmentAlreadyLoaded) return;

    prunedCues.forEach((cue) => textTrack.addCue(cue));
    update(this.#snapshotSignal, {
      context: {
        ...ctx,
        loaded: {
          ...ctx.loaded,
          [trackId]: [...existingCues, ...prunedCues],
        },
        segments: segmentAlreadyLoaded
          ? ctx.segments
          : { ...ctx.segments, [trackId]: [...existingSegments, { id: segmentId }] },
      },
    });
  }

  destroy(): void {
    update(this.#snapshotSignal, { status: 'destroyed' });
  }
}
