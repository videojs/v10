import { type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import type { Presentation } from '../../../media/types';
import { type TrackSelectionState } from '../../../media/utils/track-selection';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
export interface EndOfStreamState extends TrackSelectionState {
  presentation?: Presentation;
}
export interface EndOfStreamOwners {
  mediaSource?: MediaSource;
  /** Reactive mirror of `mediaSource.readyState` — updated via DOM events. */
  mediaSourceReadyState?: ReadonlySignal<MediaSource['readyState']>;
  mediaElement?: HTMLMediaElement | undefined;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
}
/**
 * Check if the last segment has been appended for each selected track.
 *
 * Handles video-only, audio-only, and video+audio scenarios.
 * A track with no segments (e.g. unresolved) is considered not ready.
 */
export declare function hasLastSegmentLoaded(state: EndOfStreamState, owners: EndOfStreamOwners): boolean;
/**
 * Check if we can call endOfStream.
 */
export declare function canEndStream(state: EndOfStreamState, owners: EndOfStreamOwners): boolean;
/**
 * Check if we should call endOfStream.
 */
export declare function shouldEndStream(state: EndOfStreamState, owners: EndOfStreamOwners): boolean;
/**
 * Call endOfStream when the last segment has been appended.
 * This signals to the browser that the stream is complete.
 *
 * Per the MSE spec, appendBuffer() remains valid after endOfStream() —
 * seeks that require re-appending earlier segments will still work.
 * What becomes blocked is calling endOfStream() again, addSourceBuffer(),
 * and MediaSource.duration updates.
 */
export declare function endOfStream<S extends EndOfStreamState, O extends EndOfStreamOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void;
//# sourceMappingURL=end-of-stream.d.ts.map
