/**
 * Position every selected track's timeline so model coordinates coincide with
 * the SourceBuffer's native-PTS coordinates — the loader matches `currentTime`
 * (a native-PTS value, since segments append unmodified) against each segment's
 * `startTime`, so the two timelines must agree.
 *
 * One **shared presentation anchor** — a `(media-time ↔ PDT)` correspondence —
 * drives all selected tracks (video, audio, *and* text); each track positions
 * itself onto it by its own per-segment PDT. See
 * [live-presentation-anchor](../../../../internal/decisions/live-presentation-anchor.md).
 * A two-state reactor holds it:
 *
 * - **`unanchored` (bootstrap).** Before any A/V track has buffer ground truth
 *   there's no authoritative anchor, so the manifest-only estimate
 *   (`presentationAnchorEstimate`, `averageDuration × sequence`) supplies a
 *   provisional one. Re-applied each reload — provisional, ungated — until the
 *   buffer upgrades it.
 * - **`anchored` (authoritative).** Once a selected A/V track is buffered, an
 *   injected `resolveBufferedAnchor` reports where a segment *actually* landed
 *   (native PTS); `presentationAnchorFromBuffer` turns that into the shared
 *   anchor, established **once** on entry (first track to buffer wins). Each
 *   selected track is then positioned onto it (`positionTrackToAnchor`) exactly
 *   once — including text and tracks selected later — and thereafter left to the
 *   parser's PDT-exact carry-forward. Re-positioning a pinned track every reload
 *   would *mask* a drifting baseline; positioning once *surfaces* it.
 *
 * Text has no SourceBuffer to pin, so the shared anchor is the *only* way to
 * place it; A/V and text run one code path. Cross-track A/V skew is intentionally
 * *not* corrected here — under the native-PTS default all tracks share the
 * encoder's PTS clock, so one anchor describes them all (see the decision doc).
 *
 * DOM-free: the buffered ground truth arrives via the injected resolver (the
 * engine wires it from the buffer actor's `bufferedRanges`), so this behavior
 * never touches `HTMLMediaElement`.
 */

import { isUndefined } from '@videojs/utils/predicate';
import type { Behavior, BehaviorDeps, ContextSignals } from '../../core/composition/create-composition';
import { createMachineReactor, type Reactor } from '../../core/reactors/create-machine-reactor';
import { type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import type { BufferedAnchor } from '../../media/buffered-anchor';
import {
  type PresentationAnchor,
  positionTrackToAnchor,
  presentationAnchorEstimate,
  presentationAnchorFromBuffer,
} from '../../media/presentation-anchor';
import {
  isResolvedPresentation,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  type ResolvedTrack,
  type TrackType,
} from '../../media/types';
import { findTrack, updateTrackInPresentation } from '../../media/utils/tracks';

export interface AnchorLiveTracksState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
}

/**
 * The standard behavior setup deps (`{ state, context, config }`) passed to the
 * `resolveBufferedAnchor` factory. Generic over the engine's `Context` so this
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
   * Sequence number assumed to be the stream origin (time 0) for the bootstrap
   * estimate. Default 0 — see `presentationAnchorEstimate`.
   */
  presumedStartSequence?: number;
  /**
   * Buffered-ground-truth resolver, injected by the engine (the DOM boundary).
   * Reports where a buffered segment actually sits in native PTS, or `undefined`
   * before anything is buffered. Receives the behavior's setup deps (rather than
   * closing over engine scope) so the engine reads its buffer actors from
   * `context`. Absent → estimate-only (e.g. non-DOM tests).
   */
  resolveBufferedAnchor?: (track: ResolvedTrack, deps: AnchorLiveTracksDeps<Context>) => BufferedAnchor | undefined;
}

type AnchorFsmState = 'unanchored' | 'anchored';

// The shared anchor is learned from a buffered A/V track; text has none.
const ANCHOR_SOURCE_TYPES = ['video', 'audio'] as const;
// All selected tracks ride the shared anchor — text included.
const POSITIONED_TYPES = ['video', 'audio', 'text'] as const;

function anchorLiveTracksSetup<Context extends object>({
  state,
  context,
  config = {},
}: {
  state: {
    presentation: Signal<AnchorLiveTracksState['presentation']>;
    selectedVideoTrackId?: ReadonlySignal<AnchorLiveTracksState['selectedVideoTrackId']>;
    selectedAudioTrackId?: ReadonlySignal<AnchorLiveTracksState['selectedAudioTrackId']>;
    selectedTextTrackId?: ReadonlySignal<AnchorLiveTracksState['selectedTextTrackId']>;
  };
  context: ContextSignals<Context>;
  config?: AnchorLiveTracksConfig<Context>;
}): Reactor<AnchorFsmState | 'destroying' | 'destroyed'> {
  const { presumedStartSequence = 0 } = config;
  // The deps handed to the injected resolver, so the engine reads its buffer
  // actors from `context` — no pre-composition closure over engine scope.
  const deps: AnchorLiveTracksDeps<Context> = { state, context, config };

  // The shared anchor, established once from buffer ground truth on entry to
  // `anchored`. `undefined` while unanchored — the estimate supplies a
  // provisional anchor of the same shape instead.
  let bufferAnchor: PresentationAnchor | undefined;
  // Track ids already positioned to `bufferAnchor`. Positioned once, then left
  // to the parser's carry-forward — re-positioning would mask a drifting
  // baseline rather than surface it. The estimate phase is ungated (provisional).
  const positioned = new Set<string>();

  const selectedId = (type: TrackType): string | undefined =>
    type === 'video'
      ? state.selectedVideoTrackId?.get()
      : type === 'audio'
        ? state.selectedAudioTrackId?.get()
        : state.selectedTextTrackId?.get();

  function selectedTrack(presentation: MaybeResolvedPresentation, type: TrackType): ResolvedTrack | undefined {
    const id = selectedId(type);
    if (!id) return undefined;
    const track = findTrack(presentation, type, id);
    return track && isResolvedTrack(track) ? track : undefined;
  }

  // First selected A/V track with buffer ground truth wins (video preferred).
  function deriveBufferAnchor(presentation: MaybeResolvedPresentation): PresentationAnchor | undefined {
    for (const type of ANCHOR_SOURCE_TYPES) {
      const track = selectedTrack(presentation, type);
      const anchor = track && config.resolveBufferedAnchor?.(track, deps);
      if (!track || !anchor) continue;
      const presentationAnchor = presentationAnchorFromBuffer(track, anchor.segmentId, anchor.actualStart);
      if (!isUndefined(presentationAnchor)) return presentationAnchor;
    }
    return undefined;
  }

  function deriveEstimate(presentation: MaybeResolvedPresentation): PresentationAnchor | undefined {
    for (const type of ANCHOR_SOURCE_TYPES) {
      const track = selectedTrack(presentation, type);
      const estimate = track && presentationAnchorEstimate(track, { presumedStartSequence });
      if (!isUndefined(estimate)) return estimate;
    }
    return undefined;
  }

  // `gate` true (authoritative): position each track once, then leave it. `gate`
  // false (estimate): re-apply unconditionally — provisional, settles to a no-op
  // once the estimate is stable.
  function positionSelectedTracks(presentation: MaybeResolvedPresentation, anchor: PresentationAnchor, gate: boolean) {
    const next: ResolvedTrack[] = [];
    for (const type of POSITIONED_TYPES) {
      const track = selectedTrack(presentation, type);
      // No PDT yet → can't place it; retry next reload (don't mark positioned).
      if (!track || isUndefined(track.startDate)) continue;
      if (gate) {
        if (positioned.has(track.id)) continue;
        positioned.add(track.id);
      }
      const positionedTrack = positionTrackToAnchor(track, anchor);
      // Identity-equal when nothing moved (already on the anchor).
      if (positionedTrack !== track) next.push(positionedTrack);
    }
    if (next.length === 0) return;

    update(state.presentation as Signal<MaybeResolvedPresentation>, (current) => {
      if (!isResolvedPresentation(current)) return current;
      let result = current;
      for (const track of next) result = updateTrackInPresentation(result, track);
      return result;
    });
  }

  return createMachineReactor<AnchorFsmState>({
    initial: 'unanchored',
    // Re-checks buffer availability on each reload / selection change (the
    // resolver is read untracked by the engine, so reloads — not buffer ticks —
    // drive the transition). An unresolved presentation drops back to bootstrap.
    monitor: () => {
      const presentation = state.presentation.get();
      if (!isResolvedPresentation(presentation)) return 'unanchored';
      return isUndefined(deriveBufferAnchor(presentation)) ? 'unanchored' : 'anchored';
    },
    states: {
      unanchored: {
        // Reset per source so a new source re-bootstraps from its own estimate.
        entry: () => {
          bufferAnchor = undefined;
          positioned.clear();
        },
        effects: () => {
          const presentation = state.presentation.get();
          if (!isResolvedPresentation(presentation)) return;
          const estimate = deriveEstimate(presentation);
          if (isUndefined(estimate)) return;
          positionSelectedTracks(presentation, estimate, false);
        },
      },
      anchored: {
        // Establish the shared anchor once (first track to buffer wins), and
        // clear `positioned` so every selected track re-positions onto the
        // authoritative anchor, superseding the estimate.
        entry: () => {
          const presentation = state.presentation.get();
          if (!isResolvedPresentation(presentation)) return;
          bufferAnchor = deriveBufferAnchor(presentation);
          positioned.clear();
        },
        effects: () => {
          const presentation = state.presentation.get();
          if (!isResolvedPresentation(presentation) || isUndefined(bufferAnchor)) return;
          positionSelectedTracks(presentation, bufferAnchor, true);
        },
      },
    },
  });
}

/**
 * Manual `Behavior<>` literal (like `shareSignals`): declares only `presentation`
 * in stateKeys while reading the `selected*TrackId` slots defensively, so the
 * behavior stays composable in variants that wire selection differently. Generic
 * over `Context` (like `makeShareSignals`) so the engine — which names the
 * concrete buffer actors the `resolveBufferedAnchor` factory reads — supplies the
 * context type while this behavior stays DOM-free.
 */
export function makeAnchorLiveTracks<Context extends object = object>(): Behavior<
  { presentation: Signal<AnchorLiveTracksState['presentation']> },
  ContextSignals<Context>,
  AnchorLiveTracksConfig<Context>
> {
  return {
    stateKeys: ['presentation'],
    contextKeys: [],
    setup: anchorLiveTracksSetup,
  };
}
