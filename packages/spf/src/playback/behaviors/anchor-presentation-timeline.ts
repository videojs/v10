/**
 * Establish the presentation's shared timeline anchor — for live HLS, the wall
 * clock (PDT) at media-time 0 — once per source, and stamp it onto every track so
 * the model's coordinates coincide with the SourceBuffer's native-PTS coordinates
 * (the loader matches `currentTime`, a native-PTS value since segments append
 * unmodified, against each segment's `startTime`).
 *
 * One shared anchor drives all tracks. It's learned from whichever A/V track is
 * first **actually buffered**: an injected `resolveBufferedAnchor` reads the
 * buffer actor's snapshot — the track it's buffering (`initTrackId`) and where a
 * segment landed (native PTS) — and the behavior reads that track's segment PDT
 * from the presentation, so `presentationAnchorFromBuffer` yields the shared
 * `(media-time ↔ PDT)` anchor. Established **once**, on entry to `anchored`; a
 * source change re-enters and re-establishes. (The buffered track id comes from
 * the actor, not the selection — it's what's *actually* buffered, which during a
 * switch is more reliable than the intended selection.)
 *
 * On establishment, `positionAllTracksToAnchor` stamps the anchor onto *every*
 * track in one pass: resolved tracks shift their segment timeline onto it; not-
 * yet-resolved shells get it as `startDate` so the media-playlist parser places
 * them on the shared timeline at first resolve (`placeOnAnchor`). This covers
 * unselected renditions too, so any track selected later — an ABR rung, another
 * audio language, late captions — resolves already anchored, with no per-track
 * positioning pass. Text included: it has no SourceBuffer to pin, so the shared
 * anchor is the only way to place it.
 *
 * No pre-buffer estimate. Until ground truth exists a track rides its raw parser
 * timeline — a valid timeline for fetching the first segments (the same segments
 * are fetched either way), and nothing is playing yet, so nothing is
 * mispositioned; the buffer pin supersedes it the moment a segment appends.
 *
 * DOM-free: the buffered ground truth arrives via the injected resolver (the
 * engine wires it from the buffer actor's snapshot), so this behavior never
 * touches `HTMLMediaElement`. Cross-track A/V skew is intentionally not corrected
 * here — under the native-PTS default all tracks share the encoder's PTS clock,
 * so one anchor describes them all (see the decision doc).
 *
 * Format-neutral by design (hence not named for live): the mechanism — pin one
 * track from buffer ground truth, derive one shared offset, stamp every track
 * onto it — is independent of how that offset is *sourced*. Live HLS sources it
 * from PDT (`presentationAnchorFromBuffer`); a non-zero-PTS VOD source would
 * derive it from the observed first PTS instead (no PDT), reusing this behavior
 * through the same `resolveBufferedAnchor` seam. See
 * [non-zero-pts-support](../../../../internal/design/spf/features/non-zero-pts-support.md).
 */

import { isUndefined } from '@videojs/utils/predicate';
import type { Behavior, BehaviorDeps, ContextSignals } from '../../core/composition/create-composition';
import { createMachineReactor, type Reactor } from '../../core/reactors/create-machine-reactor';
import { type Signal, update } from '../../core/signals/primitives';
import type { BufferedAnchor } from '../../media/buffered-anchor';
import {
  type PresentationAnchor,
  positionAllTracksToAnchor,
  presentationAnchorFromBuffer,
} from '../../media/presentation-anchor';
import { isResolvedPresentation, isResolvedTrack, type MaybeResolvedPresentation } from '../../media/types';
import { findTrackById } from '../../media/utils/tracks';

export interface AnchorPresentationTimelineState {
  presentation?: MaybeResolvedPresentation;
  /**
   * The established shared anchor (wall clock at media-time 0), published once
   * the buffer pin lands; `undefined` until then. Owned here; read by
   * `seekToLiveEdge` to gate its live-edge seek until the timeline is anchored —
   * seeking on the pre-anchor (raw) timeline would strand the playhead when the
   * pin later shifts the window.
   */
  presentationAnchor?: number;
}

/**
 * A buffered anchor paired with the id of the track it was read from (the buffer
 * actor's `initTrackId`), so the behavior can resolve that track's segment PDT
 * from the presentation.
 */
export interface BufferedTrackAnchor extends BufferedAnchor {
  trackId: string;
}

/**
 * The standard behavior setup deps (`{ state, context, config }`) passed to the
 * `resolveBufferedAnchor` seam. Generic over the engine's `Context` so this
 * behavior stays DOM-free — the engine (DOM boundary) names the concrete buffer
 * actors; here `Context` is opaque.
 */
export type AnchorPresentationTimelineDeps<Context extends object> = BehaviorDeps<
  { presentation: Signal<AnchorPresentationTimelineState['presentation']> },
  ContextSignals<Context>,
  AnchorPresentationTimelineConfig<Context>
>;

export interface AnchorPresentationTimelineConfig<Context extends object = object> {
  /**
   * Buffered-ground-truth resolver, injected by the engine (the DOM boundary).
   * Reads the first A/V buffer actor with ground truth and reports where a
   * buffered segment landed (native PTS) plus which track it belongs to, or
   * `undefined` before anything is buffered. Receives the behavior's setup deps
   * (rather than closing over engine scope) so the engine reads its buffer actors
   * from `context`. Absent → never anchors (e.g. non-DOM tests with no buffer).
   */
  resolveBufferedAnchor?: (deps: AnchorPresentationTimelineDeps<Context>) => BufferedTrackAnchor | undefined;
}

type AnchorFsmState = 'unanchored' | 'anchored';

function anchorPresentationTimelineSetup<Context extends object>({
  state,
  context,
  config = {},
}: {
  state: {
    presentation: Signal<AnchorPresentationTimelineState['presentation']>;
    presentationAnchor: Signal<AnchorPresentationTimelineState['presentationAnchor']>;
  };
  context: ContextSignals<Context>;
  config?: AnchorPresentationTimelineConfig<Context>;
}): Reactor<AnchorFsmState | 'destroying' | 'destroyed'> {
  // The deps handed to the injected resolver, so the engine reads its buffer
  // actors from `context` — no pre-composition closure over engine scope.
  const deps: AnchorPresentationTimelineDeps<Context> = { state, context, config };

  // The shared anchor from the first actually-buffered A/V track: the resolver
  // reports the buffered segment + its track id; that track's segment carries the
  // PDT the anchor is computed from. `undefined` until something is buffered.
  function deriveBufferAnchor(presentation: MaybeResolvedPresentation): PresentationAnchor | undefined {
    const buffered = config.resolveBufferedAnchor?.(deps);
    if (!buffered) return undefined;
    const track = findTrackById(presentation, buffered.trackId);
    if (!track || !isResolvedTrack(track)) return undefined;
    return presentationAnchorFromBuffer(track, buffered.segmentId, buffered.actualStart);
  }

  return createMachineReactor<AnchorFsmState>({
    initial: 'unanchored',
    // Checks buffer availability on each reload until anchored (the resolver is
    // read untracked by the engine, so reloads — not buffer ticks — drive the
    // transition). An unresolved presentation drops back to idle.
    monitor: () => {
      const presentation = state.presentation.get();
      if (!isResolvedPresentation(presentation)) return 'unanchored';
      // Sticky per source: once the anchor is published, stay `anchored` for the
      // lifetime of this resolved presentation. Only a source change — which
      // resets the presentation to an unresolved value (handled above) — reverts.
      // A *transient* loss of buffer ground truth (underrun, flush, seek) must NOT
      // drop the established anchor: doing so re-opens the seekToLiveEdge gate and
      // re-fires its one-time live-edge seek, jumping the playhead. "Pin-once"
      // means pin once per source — see live-presentation-anchor.md.
      if (state.presentationAnchor.get() !== undefined) return 'anchored';
      return isUndefined(deriveBufferAnchor(presentation)) ? 'unanchored' : 'anchored';
    },
    states: {
      // Reset the published anchor per source so a new source re-gates the seek.
      unanchored: { entry: () => state.presentationAnchor.set(undefined) },
      anchored: {
        // Establish the shared anchor once and stamp it onto every track. The
        // sticky monitor keeps us `anchored` for the source once `presentationAnchor` is
        // published, so this runs exactly once per source; only a source change
        // (exit to `unanchored`) re-arms it. (Were it to re-enter, re-deriving the
        // same buffer anchor is idempotent and `positionAllTracksToAnchor` writes
        // no new reference when nothing moved — so it would still be a no-op.)
        entry: () => {
          const presentation = state.presentation.get();
          if (!isResolvedPresentation(presentation)) return;
          const anchor = deriveBufferAnchor(presentation);
          if (isUndefined(anchor)) return;
          update(state.presentation as Signal<MaybeResolvedPresentation>, (current) =>
            isResolvedPresentation(current) ? positionAllTracksToAnchor(current, anchor) : current
          );
          // Publish after stamping, so a consumer reacting to the anchor (e.g.
          // seekToLiveEdge) sees the already-shifted window.
          state.presentationAnchor.set(anchor);
        },
      },
    },
  });
}

/**
 * Manual `Behavior<>` literal (like `shareSignals`), generic over `Context` (like
 * `makeShareSignals`) so the engine — which names the concrete buffer actors the
 * `resolveBufferedAnchor` seam reads — supplies the context type while this
 * behavior stays DOM-free.
 */
export function makeAnchorPresentationTimeline<Context extends object = object>(): Behavior<
  {
    presentation: Signal<AnchorPresentationTimelineState['presentation']>;
    presentationAnchor: Signal<AnchorPresentationTimelineState['presentationAnchor']>;
  },
  ContextSignals<Context>,
  AnchorPresentationTimelineConfig<Context>
> {
  return {
    stateKeys: ['presentation', 'presentationAnchor'],
    contextKeys: [],
    setup: anchorPresentationTimelineSetup,
  };
}
