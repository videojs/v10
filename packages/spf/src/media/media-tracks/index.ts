/**
 * Media-track translation utilities — pure transforms from SPF's track model
 * onto the deduped video-rendition / audio-track lists a media-element adapter
 * exposes, plus the selection-criteria builders.
 *
 * @packageDocumentation
 */

export type { AudioTrack, VideoTrack } from './media-tracks';
export {
  dedupedAudioTracks,
  dedupedVideoTracks,
  frameRateToNumber,
  toUserAudioTrackSelection,
  toUserVideoTrackSelection,
} from './media-tracks';
