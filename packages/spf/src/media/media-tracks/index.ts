/**
 * Media-track translation utilities — pure transforms from SPF's track model
 * onto the deduped video-rendition / audio-track lists a media-element adapter
 * exposes, plus the selection-criteria builders.
 *
 * @packageDocumentation
 */

export type { AudioDedupeKey, AudioTrack, VideoDedupeKey, VideoTrack } from './media-tracks';
export {
  dedupedAudioTracks,
  dedupedVideoTracks,
  findAudioTrackById,
  findVideoTrackById,
  frameRateToNumber,
  isSameAudioTrack,
  isSameVideoTrack,
  toUserAudioTrackSelection,
  toUserVideoTrackSelection,
} from './media-tracks';
