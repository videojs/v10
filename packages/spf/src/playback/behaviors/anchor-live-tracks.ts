/**
 * Position the selected tracks' timelines so model coordinates coincide with the
 * SourceBuffer's native-PTS coordinates — the loader matches `currentTime` (a
 * native-PTS value, since segments append unmodified) against each segment's
 * `startTime`, so the two timelines must agree.
 *
 * Two anchors, by precedence:
 * 1. **Buffer pin (authoritative).** Once a segment is buffered, an injected
 *    `resolveBufferedAnchor` reports where it *actually* landed (native PTS); the
 *    track re-origins onto that exactly (`anchorTrackToBufferedSegment`). The
 *    offset is constant (no-mid-stream-discontinuity assumption), so we pin
 *    **once** per track and then leave it — the parser's PDT-exact carry-forward
 *    (`placeOnPreviousTimeline`) maintains the buffer-aligned timeline across
 *    reloads. Re-pinning every reload would *mask* a drifting baseline; pinning
 *    once *surfaces* it.
 * 2. **Sequence estimate (bootstrap).** Before anything is buffered there's no
 *    ground truth, so `anchorTrackToSequenceOrigin` positions from the manifest
 *    alone (`averageDuration × sequence`) — close enough to start playback, then
 *    superseded by the pin.
 *
 * DOM-free: the buffered ground truth arrives via the injected resolver (the
 * engine wires it from the buffer actor's `bufferedRanges`), so this behavior
 * never touches `HTMLMediaElement`. The same shape serves non-zero-PTS VOD, where
 * the model is zero-based and the buffer holds the original (large) PTS.
 *
 * Cross-track A/V alignment is intentionally *not* composed here — the buffer pin
 * already lands each track on the shared native-PTS timeline.
 */

import { isUndefined } from '@videojs/utils/predicate';
import type { Behavior } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import { type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import { anchorTrackToBufferedSegment } from '../../media/anchor-track-to-buffered-segment';
import { anchorTrackToSequenceOrigin } from '../../media/anchor-track-to-sequence-origin';
import type { BufferedAnchor } from '../../media/buffered-anchor';
import {
  isResolvedPresentation,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  type ResolvedTrack,
} from '../../media/types';
import { findTrack, updateTrackInPresentation } from '../../media/utils/tracks';

export interface AnchorLiveTracksState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

export interface AnchorLiveTracksConfig {
  /**
   * Sequence number assumed to be the stream origin (time 0) for the bootstrap
   * estimate. Default 0 — see `anchorTrackToSequenceOrigin`.
   */
  presumedStartSequence?: number;
  /**
   * Buffered-ground-truth resolver, injected by the engine (the DOM boundary).
   * Returns where a buffered segment actually sits in native PTS, or `undefined`
   * before anything is buffered. Absent → estimate-only (e.g. non-DOM tests).
   */
  resolveBufferedAnchor?: (track: ResolvedTrack) => BufferedAnchor | undefined;
}

function anchorLiveTracksSetup({
  state,
  config = {},
}: {
  state: {
    presentation: Signal<AnchorLiveTracksState['presentation']>;
    selectedVideoTrackId?: ReadonlySignal<AnchorLiveTracksState['selectedVideoTrackId']>;
    selectedAudioTrackId?: ReadonlySignal<AnchorLiveTracksState['selectedAudioTrackId']>;
  };
  config?: AnchorLiveTracksConfig;
}): () => void {
  const { presumedStartSequence = 0, resolveBufferedAnchor } = config;
  // Track ids pinned to the buffer. Pinned once; thereafter the parser's
  // PDT-exact carry-forward maintains the alignment — re-pinning every reload
  // would mask a drifting baseline rather than surface it.
  const pinned = new Set<string>();

  function position(track: ResolvedTrack): ResolvedTrack {
    // Already pinned → leave it to the parser's carry-forward.
    if (pinned.has(track.id)) return track;

    // Buffer ground truth available → pin once (authoritative). Only when the
    // anchor's segment is actually in this track; otherwise fall through to the
    // estimate and retry next reload.
    const anchor = resolveBufferedAnchor?.(track);
    if (anchor && track.segments.some((s) => s.id === anchor.segmentId)) {
      pinned.add(track.id);
      return anchorTrackToBufferedSegment(track, anchor.segmentId, anchor.actualStart);
    }

    // Pre-buffer bootstrap: the manifest-only sequence estimate.
    return anchorTrackToSequenceOrigin(track, { presumedStartSequence });
  }

  return effect(() => {
    const presentation = state.presentation.get();
    if (!isResolvedPresentation(presentation)) {
      // Source unloaded/changing — drop pins so the next source re-pins.
      pinned.clear();
      return;
    }

    const videoId = state.selectedVideoTrackId?.get();
    const audioId = state.selectedAudioTrackId?.get();

    const selected = [
      videoId ? findTrack(presentation, 'video', videoId) : undefined,
      audioId ? findTrack(presentation, 'audio', audioId) : undefined,
    ];

    const positioned: ResolvedTrack[] = [];
    for (const track of selected) {
      if (!track || !isResolvedTrack(track) || isUndefined(track.startDate)) continue;
      const next = position(track);
      // Identity-equal when nothing moved (already aligned / maintain mode).
      if (next !== track) positioned.push(next);
    }
    if (positioned.length === 0) return;

    update(state.presentation as Signal<MaybeResolvedPresentation>, (current) => {
      if (!isResolvedPresentation(current)) return current;
      let result = current;
      for (const track of positioned) result = updateTrackInPresentation(result, track);
      return result;
    });
  });
}

/**
 * Manual `Behavior<>` literal (like `calculatePresentationDuration`): declares
 * only `presentation` in stateKeys while reading the `selected*TrackId` slots
 * defensively, so the behavior stays composable in variants that wire selection
 * differently.
 */
export const anchorLiveTracks: Behavior<
  { presentation: Signal<AnchorLiveTracksState['presentation']> },
  Record<string, never>,
  AnchorLiveTracksConfig
> = {
  stateKeys: ['presentation'],
  contextKeys: [],
  setup: anchorLiveTracksSetup,
};
