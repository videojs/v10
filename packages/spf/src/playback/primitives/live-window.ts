/**
 * Resolve the live window from engine state — the single call site the
 * seek-to-live-edge and live-seekable-range behaviors share, so their window
 * derivation can't drift apart.
 *
 * Picks the timeline-bearing track: the selected **video** track when present,
 * else the selected **audio** track (audio-only sources). Video and audio share
 * the timeline origin, so the video window positions both; audio-only has no
 * video track, so the audio window is authoritative.
 *
 * Reads signals lazily — call it inside a reactive context (an effect) so the
 * read tracks `presentation` + the selected-track ids.
 */
import type { ReadonlySignal } from '../../core/signals/primitives';
import { type LiveWindow, liveWindowFor } from '../../media/live-window';
import type { MaybeResolvedPresentation } from '../../media/types';

export interface LiveWindowState {
  presentation: ReadonlySignal<MaybeResolvedPresentation | undefined>;
  selectedVideoTrackId?: ReadonlySignal<string | undefined>;
  selectedAudioTrackId?: ReadonlySignal<string | undefined>;
}

export function liveWindowFromState(state: LiveWindowState): LiveWindow | null {
  const trackId = state.selectedVideoTrackId?.get() ?? state.selectedAudioTrackId?.get();
  return liveWindowFor(state.presentation.get(), trackId);
}
