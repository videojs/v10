import { untrack } from '../../../core/signals/primitives';
import { bufferedAnchorFor } from '../../../media/buffered-anchor';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import type { AnchorPresentationTimelineDeps, BufferedTrackAnchor } from '../../behaviors/anchor-presentation-timeline';

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
 * An engine's implementation of `anchorPresentationTimeline`' `resolveBufferedAnchor` seam.
 * Reads the first A/V buffer actor with ground truth (video preferred) from the
 * behavior's `context` deps — the actor knows which track it's buffering
 * (`initTrackId`) and exposes DOM-free snapshot data (appended segments +
 * native-PTS `bufferedRanges`) — and reports where a segment actually landed so
 * the model timeline can be pinned to ground truth. Reads are untracked: the pin
 * re-checks each reload, with no need to re-fire on every buffer tick.
 *
 * Generic over the engine `Context` so it stays engine-agnostic; the only
 * requirement is the per-type buffer-actor slots (`BufferActorContext`).
 */
export function resolveBufferedAnchor<Context extends BufferActorContext>({
  context,
}: AnchorPresentationTimelineDeps<Context>): BufferedTrackAnchor | undefined {
  return untrack(() => {
    // Video preferred; under the no-skew assumption both agree, so this is just
    // a tiebreak for which actor supplies the (shared) anchor.
    for (const ref of [context.videoBufferActor, context.audioBufferActor]) {
      const actor = ref?.get();
      if (!actor) continue;
      const { initTrackId, segments, bufferedRanges } = actor.snapshot.get().context;
      if (!initTrackId) continue;
      const anchor = bufferedAnchorFor(segments, bufferedRanges);
      if (anchor) return { ...anchor, trackId: initTrackId };
    }
    return undefined;
  });
}
