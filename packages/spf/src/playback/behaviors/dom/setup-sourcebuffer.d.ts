import { type Signal } from '../../../core/signals/primitives';
import type { Presentation, ResolvedTrack } from '../../../media/types';
import { type TrackSelectionState } from '../../../media/utils/track-selection';
import { type SourceBufferActor } from '../../actors/dom/source-buffer';
/**
 * Media track type for SourceBuffer setup.
 * Text tracks are excluded as they don't use MSE SourceBuffers.
 */
export type MediaTrackType = 'video' | 'audio';
/**
 * State shape for SourceBuffer setup.
 */
export interface SourceBufferState extends TrackSelectionState {
  presentation?: Presentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}
/**
 * Owners shape for SourceBuffer setup.
 */
export interface SourceBufferOwners {
  mediaSource?: MediaSource;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
}
/**
 * Build MIME codec string from track metadata.
 *
 * @param track - Resolved track with mimeType and codecs
 * @returns MIME codec string (e.g., 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"')
 *
 * @example
 * buildMimeCodec({ mimeType: 'video/mp4', codecs: ['avc1.42E01E'] })
 * // => 'video/mp4; codecs="avc1.42E01E"'
 */
export declare function buildMimeCodec(track: ResolvedTrack): string;
/**
 * Setup all needed SourceBuffers as a single coordinated operation.
 *
 * Waits until ALL media tracks in the presentation are resolved with codecs,
 * then creates every SourceBuffer in one synchronous block before setting
 * owners. This guarantees that downstream consumers (e.g. loadSegments) never
 * see a partial set of SourceBuffers — preventing the Firefox bug where
 * appending to a video SourceBuffer before the audio SourceBuffer exists
 * causes mozHasAudio to be permanently false.
 *
 * Handles video-only, audio-only, and combined presentations correctly:
 * track types are derived from the presentation rather than hardcoded.
 *
 * @example
 * const cleanup = setupSourceBuffers({ state, owners });
 */
export declare function setupSourceBuffers<S extends SourceBufferState, O extends SourceBufferOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void;
//# sourceMappingURL=setup-sourcebuffer.d.ts.map
