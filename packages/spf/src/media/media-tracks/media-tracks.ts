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
import { findTrackById, getTracksByType } from '../utils/tracks';

export type { VideoTrack, AudioTrack };

/** Properties that identify a distinct video rendition (multi-CDN copies share them). */
export interface VideoDedupeKey {
  width?: VideoTrack['width'];
  height?: VideoTrack['height'];
  bandwidth?: VideoTrack['bandwidth'];
}

/** Properties that identify a distinct audio track (multi-CDN copies share them). */
export interface AudioDedupeKey {
  language?: AudioTrack['language'];
  name?: AudioTrack['name'];
}

/**
 * The distinct video tracks of a presentation, deduped by {@link VideoDedupeKey} (first occurrence wins).
 *
 * Returns `[]` when the presentation is unresolved or has no video tracks.
 */
export function dedupedVideoTracks(presentation: MaybeResolvedPresentation | undefined): VideoTrack[] {
  if (!presentation) return [];

  return dedupe({
    tracks: getTracksByType(presentation, 'video') as readonly VideoTrack[],
    keyFn: toUserVideoTrackSelection,
  });
}

/**
 * The distinct audio tracks of a presentation, deduped by `language` + `name`
 * (first occurrence wins). Returns `[]` when the presentation is unresolved or has no audio tracks.
 */
export function dedupedAudioTracks(presentation: MaybeResolvedPresentation | undefined): AudioTrack[] {
  if (!presentation) return [];

  return dedupe({
    tracks: getTracksByType(presentation, 'audio') as readonly AudioTrack[],
    keyFn: toUserAudioTrackSelection,
  });
}

/**
 * Find a video track by id, searching the same candidate set the engine resolves
 * against ({@link dedupedVideoTracks}'s pre-dedupe source). Returns `undefined`
 * when absent. Maps the engine's resolved `selectedVideoTrackId` back to its
 * properties for `active` reflection — the resolved id may be a per-CDN copy that
 * isn't the representative {@link dedupedVideoTracks} kept.
 */
export function findVideoTrackById(
  presentation: MaybeResolvedPresentation | undefined,
  id: string | undefined
): VideoTrack | undefined {
  if (!presentation || !id) return undefined;
  const track = findTrackById(presentation, id);
  return track?.type === 'video' ? (track as VideoTrack) : undefined;
}

/** Audio counterpart of {@link findVideoTrackById}, for `enabled` reflection. */
export function findAudioTrackById(
  presentation: MaybeResolvedPresentation | undefined,
  id: string | undefined
): AudioTrack | undefined {
  if (!presentation || !id) return undefined;
  const track = findTrackById(presentation, id);
  return track?.type === 'audio' ? (track as AudioTrack) : undefined;
}

/**
 * Shallow-equal two key objects by their own properties. Both come from the same
 * key builder, so they carry the same keys — a one-directional scan suffices.
 */
function sameKey<K extends object>(a: K, b: K): boolean {
  for (const attr in a) {
    if (a[attr] !== b[attr]) return false;
  }
  return true;
}

/**
 * Dedupe tracks by a key function, keeping the first occurrence of each key.
 * Keys are compared field-by-field ({@link sameKey}).
 */
function dedupe<T, K extends object>({
  tracks,
  keyFn,
}: {
  tracks: readonly T[];
  keyFn: (track: T) => K | undefined;
}): T[] {
  const seen: K[] = [];
  const kept: T[] = [];
  for (const track of tracks) {
    const key = keyFn(track);
    if (!key || seen.some((other) => sameKey(other, key))) continue;
    seen.push(key);
    kept.push(track);
  }

  return kept;
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

/** Whether two video tracks are the same by dedupe key */
export function isSameVideoTrack(a: VideoDedupeKey, b: VideoDedupeKey | undefined): boolean {
  return !!b && a.width === b.width && a.height === b.height && a.bandwidth === b.bandwidth;
}

/** Whether two audio tracks are the same by dedupe key */
export function isSameAudioTrack(a: AudioDedupeKey, b: AudioDedupeKey | undefined): boolean {
  return !!b && (a.language ?? '') === (b.language ?? '') && a.name === b.name;
}

/** Collapse a rational frame rate (numerator/denominator) to frames per second. */
export const frameRateToNumber = (frameRate: FrameRate) => {
  return frameRate.frameRateNumerator / (frameRate.frameRateDenominator ?? 1);
};
