import { isUndefined } from '@videojs/utils/predicate';
import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation, ResolvedTrack } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { BufferKeyByType, getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';
import { createSourceBuffer } from '../media/mediasource-setup';

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
export function buildMimeCodec(track: ResolvedTrack): string {
  const codecString = track.codecs?.join(',') ?? '';
  return `${track.mimeType}; codecs="${codecString}"`;
}

/**
 * Check if we can setup SourceBuffer for track type.
 *
 * Requires:
 * - MediaSource exists in owners
 * - Track is selected
 *
 * Note: We don't check mediaSource.readyState because owners holds references
 * to mutable objects. Changes to properties on those objects won't trigger
 * observations. Instead, setupMediaSource only patches owners.mediaSource after
 * it's already open, so if it exists in owners, it's ready to use.
 *
 * Note: Track does not need to be resolved yet. The orchestration will wait
 * for the track to be resolved (via resolveTrack) before creating the SourceBuffer.
 */
export function canSetupBuffer(state: SourceBufferState, owners: SourceBufferOwners, type: MediaTrackType): boolean {
  // MediaSource exists (already open - see note above)
  if (!owners.mediaSource) {
    return false;
  }

  // Need selected track (doesn't need to be resolved yet)
  const track = getSelectedTrack(state, type);
  if (!track) {
    return false;
  }

  return true;
}

/**
 * Check if we should create SourceBuffer (not already created).
 */
export function shouldSetupBuffer(owners: SourceBufferOwners, type: MediaTrackType): boolean {
  const bufferKey = BufferKeyByType[type];
  return isUndefined(owners[bufferKey]);
}

/**
 * Configuration for SourceBuffer setup.
 */
export interface SourceBufferConfig<T extends MediaTrackType = MediaTrackType> {
  type: T;
}

/**
 * Setup SourceBuffer orchestration.
 *
 * Triggers when:
 * - MediaSource exists and is in 'open' state
 * - Track is selected (same condition as resolveTrack)
 *
 * Creates SourceBuffer when track becomes resolved with codecs.
 * This allows setupSourceBuffer to run in parallel with resolveTrack.
 *
 * Note: Text tracks don't use SourceBuffers and should be handled separately.
 *
 * Generic over track type - create one orchestration per track type:
 * @example
 * const videoCleanup = setupSourceBuffer({ state, owners }, { type: 'video' });
 * const audioCleanup = setupSourceBuffer({ state, owners }, { type: 'audio' });
 */
export function setupSourceBuffer<T extends MediaTrackType>(
  {
    state,
    owners,
  }: {
    state: WritableState<SourceBufferState>;
    owners: WritableState<SourceBufferOwners>;
  },
  config: SourceBufferConfig<T>
): () => void {
  let settingUp = false;

  return combineLatest([state, owners]).subscribe(async ([s, o]: [SourceBufferState, SourceBufferOwners]) => {
    // Check orchestration conditions (track selected, MediaSource open)
    if (settingUp) return;
    if (!canSetupBuffer(s, o, config.type) || !shouldSetupBuffer(o, config.type)) return;

    try {
      settingUp = true;

      // Wait for track to be resolved with codecs before creating SourceBuffer
      const track = getSelectedTrack(s, config.type);
      if (!track || !isResolvedTrack(track)) return;
      if (!track.codecs || track.codecs.length === 0) return;

      const mimeCodec = buildMimeCodec(track);

      // Create SourceBuffer
      const buffer = createSourceBuffer(o.mediaSource!, mimeCodec);

      // Update owners with buffer reference
      const bufferKey = BufferKeyByType[config.type];
      owners.patch({ [bufferKey]: buffer });

      // Wait a frame before clearing flag to allow async state updates to flush
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } finally {
      settingUp = false;
    }
  });
}
