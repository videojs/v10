import type {
  TextTrackSegmentLoaderActor,
  TextTrackSegmentLoaderMessage,
} from '../../media/actors/text-track-segment-loader';
import { createTextTrackSegmentLoaderActor as createMediaFactory } from '../../media/actors/text-track-segment-loader';
import type { TextTracksActor } from '../../media/actors/text-tracks';
import { parseVttSegment } from '../text/parse-vtt-segment';

// Re-export the host-agnostic types so existing dom-side consumers can keep
// importing from this module.
export type { TextTrackSegmentLoaderActor, TextTrackSegmentLoaderMessage };

/**
 * DOM-flavored text-track segment loader factory.
 *
 * Thin wrapper over the host-agnostic factory in `media/actors/` that
 * binds the browser's native VTT parser. Used by the HLS engine today;
 * non-browser engines build the actor directly against the media-level
 * factory with their own parser.
 */
export function createTextTrackSegmentLoaderActor(
  textTracksActor: TextTracksActor<VTTCue>
): TextTrackSegmentLoaderActor {
  return createMediaFactory(textTracksActor, parseVttSegment);
}
