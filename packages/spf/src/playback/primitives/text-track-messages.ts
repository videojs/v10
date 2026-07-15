/**
 * Cue-sink message protocol — the `add-cues` operation a text-track sink accepts.
 * Plain, transport-neutral data: the text load pipeline (`text-segment-load-pipeline`)
 * produces it and the TextTracksActor consumes it, so it lives at the primitives layer
 * both depend on. The text mirror of `source-buffer-messages`.
 */
import type { Cue, Segment } from '../../media/types';

/** Segment identity and timing — mirrors AppendSegmentMeta without trackId (keyed separately). */
export type CueSegmentMeta = Pick<Segment, 'id' | 'startTime' | 'duration'> & { trackId: string };

export interface AddCuesMessage<C extends Cue = Cue> {
  type: 'add-cues';
  meta: CueSegmentMeta;
  cues: C[];
}
