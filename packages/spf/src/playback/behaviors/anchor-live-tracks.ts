/**
 * Anchor the selected live tracks' timelines to the estimated stream origin.
 *
 * The segment loader matches `currentTime` (the SourceBuffer's native-PTS
 * coordinate, since segments append unmodified) against each segment's
 * `startTime`. For live, the manifest's `startTime` (EXTINF-from-0) is *not*
 * the native PTS, so without adjustment the loader can't find the segments
 * around the playhead. This applies `anchorTrackToSequenceOrigin` to each
 * selected resolved track so `startTime` reads as elapsed-since-stream-start —
 * which ≈ native PTS when the encoder's timeline is stream-relative — closing
 * that gap from the manifest alone (refined later from the buffer).
 *
 * Per-track and idempotent: `anchorTrackToSequenceOrigin` returns the same
 * track once anchored (shift 0), so the effect converges without re-firing.
 * Cross-track A/V alignment (`alignTrackTimelines`) is intentionally *not*
 * composed here — it would fight the per-track anchor in a re-firing effect;
 * the residual per-track skew is absorbed by native-PTS A/V sync in the buffer.
 */

import { isUndefined } from '@videojs/utils/predicate';
import type { Behavior } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import { type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import { anchorTrackToSequenceOrigin } from '../../media/anchor-track-to-sequence-origin';
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
   * Sequence number assumed to be the stream origin (time 0). Default 0 —
   * see `anchorTrackToSequenceOrigin`.
   */
  presumedStartSequence?: number;
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
  const { presumedStartSequence = 0 } = config;

  return effect(() => {
    const presentation = state.presentation.get();
    if (!isResolvedPresentation(presentation)) return;

    const videoId = state.selectedVideoTrackId?.get();
    const audioId = state.selectedAudioTrackId?.get();

    const selected = [
      videoId ? findTrack(presentation, 'video', videoId) : undefined,
      audioId ? findTrack(presentation, 'audio', audioId) : undefined,
    ];

    const anchored: ResolvedTrack[] = [];
    for (const track of selected) {
      if (!track || !isResolvedTrack(track) || isUndefined(track.startDate)) continue;
      const next = anchorTrackToSequenceOrigin(track, { presumedStartSequence });
      // Identity-equal when already anchored (shift 0) → nothing to patch.
      if (next !== track) anchored.push(next);
    }
    if (anchored.length === 0) return;

    update(state.presentation as Signal<MaybeResolvedPresentation>, (current) => {
      if (!isResolvedPresentation(current)) return current;
      let result = current;
      for (const track of anchored) result = updateTrackInPresentation(result, track);
      return result;
    });
  });
}

/**
 * Manual `Behavior<>` literal (like `calculatePresentationDuration`): declares
 * only `presentation` in stateKeys while reading the `selected*TrackId` slots
 * defensively, so the behavior stays composable in variants that wire
 * selection differently.
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
