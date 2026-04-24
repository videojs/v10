import type { CallbackActor } from '../../core/actors/actor';
import type { TextTrack } from '../types';

export type TextTrackSegmentLoaderMessage = {
  type: 'load';
  track: TextTrack;
  currentTime: number;
};

/**
 * Host-agnostic text-track segment loader actor type.
 *
 * The concrete factory — which binds a cue parser — lives where the
 * host's parsing capability lives (e.g. `dom/actors/text-track-segment-loader.ts`
 * for a browser VTT parser).
 */
export type TextTrackSegmentLoaderActor = CallbackActor<TextTrackSegmentLoaderMessage>;
