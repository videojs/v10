import { type Signal } from '../../../core/signals/primitives';
import { type BandwidthState } from '../../../media/abr/bandwidth-estimator';
import type { Presentation } from '../../../media/types';
import { type TrackSelectionState } from '../../../media/utils/track-selection';
import { type BufferState, type SourceBufferState } from '../../actors/dom/segment-loader';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import type { MediaTrackType } from './setup-sourcebuffer';
export type { BufferState, SourceBufferState };
/**
 * State shape for segment loading.
 */
export interface SegmentLoadingState extends TrackSelectionState {
  presentation?: Presentation;
  preload?: string;
  bandwidthState?: BandwidthState;
  /** Current playback position in seconds. Defaults to 0 when undefined. */
  currentTime?: number;
  /** True once the user has initiated playback. Allows segment loading regardless of preload setting. */
  playbackInitiated?: boolean;
}
/**
 * Owners shape for segment loading.
 */
export interface SegmentLoadingOwners {
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
}
/**
 * Load segments orchestration — Reactor layer.
 *
 * Sends typed load messages to a SegmentLoaderActor when relevant conditions
 * change. Uses targeted subscriptions rather than broad combineLatest so only
 * meaningful state changes trigger evaluation.
 *
 * Condition hierarchy (see SegmentLoadingKey for detail):
 *
 *   !playbackInitiated
 *     preload==='none' (or unset)  → dormant; no trigger
 *     preload==='metadata'         → trigger on transition to 'metadata'
 *     preload==='auto'             → trigger on transition to 'auto'
 *
 *   !playbackInitiated → playbackInitiated
 *     preload !== 'auto'           → trigger (message shape changes)
 *     preload === 'auto'           → suppressed (was already full-range mode;
 *                                    let segmentStart take over post-play)
 *                                    KNOWN LIMITATION: seek-before-play with
 *                                    preload='auto' is not supported — if the
 *                                    user seeks before pressing play, the
 *                                    first re-send is delayed until the next
 *                                    segment boundary crossing post-play.
 *
 *   playbackInitiated
 *     resolvedTrackId changes      → trigger
 *     segmentStart(currentTime) changes → trigger (segment boundary only)
 *
 * @example
 * const cleanup = loadSegments({ state, owners }, { type: 'video' });
 */
export declare function loadSegments<S extends SegmentLoadingState, O extends SegmentLoadingOwners>(
  {
    state,
    owners,
  }: {
    state: Signal<S>;
    owners: Signal<O>;
  },
  config: {
    type: MediaTrackType;
  }
): () => void;
//# sourceMappingURL=load-segments.d.ts.map
