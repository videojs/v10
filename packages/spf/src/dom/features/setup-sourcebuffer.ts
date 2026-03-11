import { isUndefined } from '@videojs/utils/predicate';
import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation, ResolvedTrack } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { BufferKeyByType, getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';
import { createSourceBuffer } from '../media/mediasource-setup';
import { createSourceBufferActor, type SourceBufferActor } from '../media/source-buffer-actor';

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
 * Setup all needed SourceBuffers as a single coordinated operation.
 *
 * Waits until ALL selected tracks (video and/or audio) are resolved with
 * codecs, then creates every SourceBuffer in one synchronous block before
 * patching owners. This guarantees that downstream consumers (e.g.
 * loadSegments) never see a partial set of SourceBuffers — preventing the
 * Firefox bug where appending to a video SourceBuffer before the audio
 * SourceBuffer exists causes mozHasAudio to be permanently false.
 *
 * Handles video-only, audio-only, and combined presentations correctly:
 * only the tracks that are actually selected are waited on and created.
 *
 * @example
 * const cleanup = setupSourceBuffers({ state, owners });
 */
export function setupSourceBuffers({
  state,
  owners,
}: {
  state: WritableState<SourceBufferState>;
  owners: WritableState<SourceBufferOwners>;
}): () => void {
  let setupDone = false;

  const cleanup = combineLatest([state, owners]).subscribe(
    async ([currentState, currentOwners]: [SourceBufferState, SourceBufferOwners]) => {
      if (setupDone) return;
      if (!currentOwners.mediaSource) return;

      const videoSelected = !!currentState.selectedVideoTrackId;
      const audioSelected = !!currentState.selectedAudioTrackId;

      if (!videoSelected && !audioSelected) return;

      const videoTrack = videoSelected ? getSelectedTrack(currentState, 'video') : null;
      const audioTrack = audioSelected ? getSelectedTrack(currentState, 'audio') : null;

      // Wait until every selected track is resolved with codecs before
      // creating any SourceBuffer. This is the coordination guarantee.
      if (videoSelected && (!videoTrack || !isResolvedTrack(videoTrack) || !videoTrack.codecs?.length)) return;
      if (audioSelected && (!audioTrack || !isResolvedTrack(audioTrack) || !audioTrack.codecs?.length)) return;

      setupDone = true;

      // Create all SourceBuffers synchronously — no await between addSourceBuffer
      // calls — then patch owners once so subscribers see all buffers simultaneously.
      const patch: Partial<SourceBufferOwners> = {};

      if (videoSelected && videoTrack && isResolvedTrack(videoTrack)) {
        const buffer = createSourceBuffer(currentOwners.mediaSource!, buildMimeCodec(videoTrack));
        patch.videoBuffer = buffer;
        patch.videoBufferActor = createSourceBufferActor(buffer);
      }

      if (audioSelected && audioTrack && isResolvedTrack(audioTrack)) {
        const buffer = createSourceBuffer(currentOwners.mediaSource!, buildMimeCodec(audioTrack));
        patch.audioBuffer = buffer;
        patch.audioBufferActor = createSourceBufferActor(buffer);
      }

      owners.patch(patch);

      // Wait a frame to allow async state updates to flush before downstream
      // orchestrations (loadSegments) begin reacting to the new owners.
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  );

  return cleanup;
}
