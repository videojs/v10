import { untrack } from '../../../core/signals/primitives';
import { type BufferedAnchor, bufferedAnchorFor } from '../../../media/buffered-anchor';
import type { ResolvedTrack } from '../../../media/types';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import type { AnchorLiveTracksDeps } from '../../behaviors/anchor-live-tracks';

/**
 * The engine context this resolver reads — the per-type SourceBuffer actors.
 * Declared as the minimal contract (not a specific engine's context) so any
 * engine satisfies it: the default video+audio engine, and a future audio-only
 * live engine (which omits `videoBufferActor`, fine as it's optional).
 */
export interface BufferActorContext {
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
}

/**
 * An engine's implementation of `anchorLiveTracks`' `resolveBufferedAnchor` seam.
 * Reads the buffer actors from the behavior's `context` deps — the actors'
 * DOM-free snapshot data (appended segments + native-PTS `bufferedRanges`) — to
 * report where a segment actually landed, so the model timeline can be pinned to
 * ground truth. Reads are untracked: the pin re-checks each reload, with no need
 * to re-fire on every buffer tick.
 *
 * Generic over the engine `Context` so it stays engine-agnostic; the only
 * requirement is the per-type buffer-actor slots (`BufferActorContext`).
 */
export function resolveBufferedAnchor<Context extends BufferActorContext>(
  track: ResolvedTrack,
  { context }: AnchorLiveTracksDeps<Context>
): BufferedAnchor | undefined {
  return untrack(() => {
    const actor = (
      track.type === 'video' ? context.videoBufferActor : track.type === 'audio' ? context.audioBufferActor : undefined
    )?.get();
    if (!actor) return undefined;
    const { context: bufferContext } = actor.snapshot.get();
    return bufferedAnchorFor(bufferContext.segments, bufferContext.bufferedRanges);
  });
}
