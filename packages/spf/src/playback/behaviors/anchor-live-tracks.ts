/**
 * Establish the live presentation's shared timeline anchor — the wall clock
 * (PDT) at media-time 0 — once per source, and stamp it onto every track so the
 * model's coordinates coincide with the SourceBuffer's native-PTS coordinates
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

export interface AnchorLiveTracksState {
  presentation?: MaybeResolvedPresentation;
  /**
   * The established shared anchor (wall clock at media-time 0), published once
   * the buffer pin lands; `undefined` until then. Owned here; read by
   * `seekToLiveEdge` to gate its live-edge seek until the timeline is anchored —
   * seeking on the pre-anchor (raw) timeline would strand the playhead when the
   * pin later shifts the window.
   */
  liveAnchor?: number;
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
export type AnchorLiveTracksDeps<Context extends object> = BehaviorDeps<
  { presentation: Signal<AnchorLiveTracksState['presentation']> },
  ContextSignals<Context>,
  AnchorLiveTracksConfig<Context>
>;

export interface AnchorLiveTracksConfig<Context extends object = object> {
  /**
   * Buffered-ground-truth resolver, injected by the engine (the DOM boundary).
   * Reads the first A/V buffer actor with ground truth and reports where a
   * buffered segment landed (native PTS) plus which track it belongs to, or
   * `undefined` before anything is buffered. Receives the behavior's setup deps
   * (rather than closing over engine scope) so the engine reads its buffer actors
   * from `context`. Absent → never anchors (e.g. non-DOM tests with no buffer).
   */
  resolveBufferedAnchor?: (deps: AnchorLiveTracksDeps<Context>) => BufferedTrackAnchor | undefined;
}

type AnchorFsmState = 'unanchored' | 'anchored';

function anchorLiveTracksSetup<Context extends object>({
  state,
  context,
  config = {},
}: {
  state: {
    presentation: Signal<AnchorLiveTracksState['presentation']>;
    liveAnchor: Signal<AnchorLiveTracksState['liveAnchor']>;
  };
  context: ContextSignals<Context>;
  config?: AnchorLiveTracksConfig<Context>;
}): Reactor<AnchorFsmState | 'destroying' | 'destroyed'> {
  // The deps handed to the injected resolver, so the engine reads its buffer
  // actors from `context` — no pre-composition closure over engine scope.
  const deps: AnchorLiveTracksDeps<Context> = { state, context, config };

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
    // Re-checks buffer availability on each reload (the resolver is read untracked
    // by the engine, so reloads — not buffer ticks — drive the transition). An
    // unresolved presentation drops back to idle.
    monitor: () => {
      const presentation = state.presentation.get();
      if (!isResolvedPresentation(presentation)) return 'unanchored';
      return isUndefined(deriveBufferAnchor(presentation)) ? 'unanchored' : 'anchored';
    },
    states: {
      // Reset the published anchor per source so a new source re-gates the seek.
      unanchored: { entry: () => state.liveAnchor.set(undefined) },
      anchored: {
        // Establish the shared anchor once and stamp it onto every track. Runs
        // once per entry; a source change exits to `unanchored`, so the next
        // source re-establishes. Re-deriving the same buffer anchor is idempotent
        // (segment PDT and native-PTS start are stable), and
        // `positionAllTracksToAnchor` writes no new reference when nothing moved —
        // so a transient re-entry is a no-op.
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
          state.liveAnchor.set(anchor);
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
export function makeAnchorLiveTracks<Context extends object = object>(): Behavior<
  {
    presentation: Signal<AnchorLiveTracksState['presentation']>;
    liveAnchor: Signal<AnchorLiveTracksState['liveAnchor']>;
  },
  ContextSignals<Context>,
  AnchorLiveTracksConfig<Context>
> {
  return {
    stateKeys: ['presentation', 'liveAnchor'],
    contextKeys: [],
    setup: anchorLiveTracksSetup,
  };
}
