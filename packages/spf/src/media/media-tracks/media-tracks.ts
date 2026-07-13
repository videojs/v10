/**
 * Media-track translation utilities.
 *
 * Pure, DOM-free transforms from SPF's CMAF-HAM track model onto the deduped
 * lists a media-element adapter exposes (video renditions, audio tracks), plus
 * the selection-criteria builders that turn a chosen rendition/track back into a
 * `user*TrackSelection` partial the engine's track-switching reads.
 *
 * These return SPF *model vocabulary* (`bandwidth`, `codecs: string[]`,
 * `frameRate` as a rational `FrameRate`); the consuming adapter owns the
 * mapping (e.g. for DOM `bandwidth` -> `bitrate`, `codecs.join(',')` -> `codec`,
 * `name` -> `label`).
 *
 * Deduplication is by *properties*, never URL, so a multi-CDN source that lists
 * the same rendition on several hosts collapses to one entry: video renditions
 * by `width` + `height` + `bandwidth`, audio tracks by `language` + `name`.
 * The selection builders emit those same properties as the match criteria, so
 * selecting a collapsed entry re-selects, for example, every underlying per-CDN track.
 */

import type { AudioTrack, FrameRate, MaybeResolvedPresentation, VideoTrack } from '../types';
import { getTracksByType } from '../utils/tracks';

export type { VideoTrack, AudioTrack };

/** Properties that identify a distinct video rendition (multi-CDN copies share them). */
interface VideoDedupeKey {
  width?: VideoTrack['width'];
  height?: VideoTrack['height'];
  bandwidth: VideoTrack['bandwidth'];
}

/** Properties that identify a distinct audio track (multi-CDN copies share them). */
interface AudioDedupeKey {
  language?: AudioTrack['language'];
  name?: AudioTrack['name'];
}

const videoRenditionKey = (track: VideoDedupeKey): string =>
  `${track.width ?? ''}x${track.height ?? ''}@${track.bandwidth}`;

/**
 * The distinct video tracks of a presentation, deduped by {@link VideoDedupeKey} (first occurrence wins).
 *
 * Returns `[]` when the presentation is unresolved or has no video tracks.
 */
export function dedupedVideoTracks(presentation: MaybeResolvedPresentation | undefined): VideoTrack[] {
  if (!presentation) return [];

  return dedupe({
    tracks: getTracksByType(presentation, 'video') as readonly VideoTrack[],
    keyFn: videoRenditionKey,
  });
}

const audioTrackKey = (track: AudioDedupeKey): string => `${track.language ?? ''}-${track.name}`;

/**
 * The distinct audio tracks of a presentation, deduped by `language` + `name`
 * (first occurrence wins). Returns `[]` when the presentation is unresolved or has no audio tracks.
 */
export function dedupedAudioTracks(presentation: MaybeResolvedPresentation | undefined): AudioTrack[] {
  if (!presentation) return [];

  return dedupe({
    tracks: getTracksByType(presentation, 'audio') as readonly AudioTrack[],
    keyFn: audioTrackKey,
  });
}

/** Dedupe tracks by a key function, keeping the first occurrence of each key. */
function dedupe<T, K>({ tracks, keyFn }: { tracks: readonly T[]; keyFn: (track: T) => K }): T[] {
  const deduped = new Map<K, T>();
  tracks.forEach((track) => {
    const key = keyFn(track);
    if (!deduped.has(key)) {
      deduped.set(key, track);
    }
  });

  return [...deduped.values()];
}

/**
 * Build a partial video track that can be used as `userVideoTrackSelection`.
 */
export function toUserVideoTrackSelection<T extends VideoDedupeKey>(rendition?: T): Partial<VideoTrack> | undefined {
  return rendition ? { width: rendition.width, height: rendition.height, bandwidth: rendition.bandwidth } : undefined;
}

/**
 * Build a partial audio track that can be used as a `userAudioTrackSelection`.
 */
export function toUserAudioTrackSelection<T extends AudioDedupeKey>(track?: T): Partial<AudioTrack> | undefined {
  return track ? { language: track.language, name: track.name } : undefined;
}

/** Collapse a rational frame rate (numerator/denominator) to frames per second. */
export const frameRateToNumber = (frameRate: FrameRate) => {
  return frameRate.frameRateNumerator / (frameRate.frameRateDenominator ?? 1);
};
