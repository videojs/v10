import { type MessageActor } from '../../../core/actors/create-machine-actor';
import type { Segment, Track } from '../../../media/types';
import { type AppendData } from './append-segment';
export interface BufferedRange {
  start: number;
  end: number;
}
export type AppendSegmentMeta = Pick<Segment, 'id' | 'startTime' | 'duration'> & {
  trackId: Track['id'];
  /** Declared track bandwidth in bps (from playlist BANDWIDTH attribute). */
  trackBandwidth?: number;
};
export type { AppendData };
export type AppendInitMessage = {
  type: 'append-init';
  data: AppendData;
  meta: {
    trackId: Track['id'];
  };
};
export type AppendSegmentMessage = {
  type: 'append-segment';
  data: AppendData;
  meta: AppendSegmentMeta;
};
export type RemoveMessage = {
  type: 'remove';
  start: number;
  end: number;
};
export type IndividualSourceBufferMessage = AppendInitMessage | AppendSegmentMessage | RemoveMessage;
export type BatchMessage = {
  type: 'batch';
  messages: IndividualSourceBufferMessage[];
};
export type CancelMessage = {
  type: 'cancel';
};
/** All messages accepted by a SourceBufferActor. */
export type SourceBufferMessage = IndividualSourceBufferMessage | BatchMessage | CancelMessage;
/** Finite states of the actor. */
export type SourceBufferActorState = 'idle' | 'updating' | 'destroyed';
/** Non-finite (extended) data managed by the actor — the XState "context". */
export interface SourceBufferActorContext {
  initTrackId?: string | undefined;
  segments: Array<
    Pick<Segment, 'id' | 'startTime' | 'duration'> & {
      trackId: Track['id'];
      trackBandwidth?: number;
      /**
       * True while a streaming append is in progress for this segment.
       * The segment's data is partially present in the SourceBuffer.
       * Downstream code must not treat a partial segment as fully buffered.
       */
      partial?: boolean;
    }
  >;
  bufferedRanges: BufferedRange[];
}
/** SourceBuffer actor: queues operations, owns its snapshot. */
export type SourceBufferActor = MessageActor<SourceBufferActorState, SourceBufferActorContext, SourceBufferMessage>;
export declare function createSourceBufferActor(
  sourceBuffer: SourceBuffer,
  initialContext?: Partial<SourceBufferActorContext>
): SourceBufferActor;
//# sourceMappingURL=source-buffer.d.ts.map
