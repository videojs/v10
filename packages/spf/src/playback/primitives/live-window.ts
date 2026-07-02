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
import { getTracksByType } from '../../media/utils/tracks';

export interface LiveWindowState {
  presentation: ReadonlySignal<MaybeResolvedPresentation | undefined>;
  selectedVideoTrackId?: ReadonlySignal<string | undefined>;
  selectedAudioTrackId?: ReadonlySignal<string | undefined>;
}

/**
 * The id of the timeline-bearing track: the selected video track when present,
 * else the selected audio track. The single pick both the window derivation and
 * the live-latency resolution (`seek-to-live-edge`) share, so they can't drift.
 */
export function liveTrackId(state: LiveWindowState): string | undefined {
  return state.selectedVideoTrackId?.get() ?? state.selectedAudioTrackId?.get();
}

export function liveWindowFromState(state: LiveWindowState): LiveWindow | null {
  const presentation = state.presentation.get();

  // Prefer the selected timeline-bearing track when it's resolved.
  const selected = liveWindowFor(presentation, liveTrackId(state));
  if (selected) return selected;

  // The selected track isn't resolved yet (e.g. briefly mid ABR / user switch).
  // The live window is a presentation-level property — all renditions are
  // time-aligned and share the anchor — so fall back to any resolved track of the
  // timeline-bearing type rather than letting the window blink to `null`. A null
  // blink would flip `seekToLiveEdge` out of `live` and re-fire its one-time edge
  // seek (yanking a viewer who has scrubbed back), and stall the seekable-range
  // writer. A deselected track's window may trail live by up to one reload during
  // the switch gap — acceptable, and the selected track's fresh window resumes the
  // moment it resolves.
  if (!presentation) return null;
  const type = state.selectedVideoTrackId?.get() ? 'video' : 'audio';
  for (const track of getTracksByType(presentation, type)) {
    const window = liveWindowFor(presentation, track.id);
    if (window) return window;
  }
  return null;
}

/**
 * Resolve the target live latency (seconds the playhead should trail the live
 * edge) for the timeline-bearing track. Format-specific — supplied by the engine
 * (HLS: `HOLD-BACK`; DASH would use `suggestedPresentationDelay`) — so the live
 * edge stays format-neutral.
 */
export type ResolveLiveLatency = (
  presentation: MaybeResolvedPresentation | undefined,
  trackId: string | undefined
) => number;

/** The live window plus the target playhead position within it. */
export interface LiveEdge extends LiveWindow {
  /** Where to sit near the live edge: `end` − live latency, clamped to `start`. */
  liveEdgeStart: number;
}

/**
 * Resolve the live edge — the window bounds plus the target playhead position —
 * from a behavior's setup arguments. Bundles the window geometry and the
 * format-specific latency policy (`config.resolveLiveLatency`) so the consuming
 * behavior never has to compose them; it just forwards its `{ state, config }`.
 * `null` when there is no live edge (VOD / ended / unresolved).
 *
 * Reads signals lazily — call it inside a reactive context (an effect).
 */
export function getLiveEdge({
  state,
  // context,  // not needed yet; in the shape for setup-parity when it is
  config,
}: {
  state: LiveWindowState;
  config?: { resolveLiveLatency?: ResolveLiveLatency };
}): LiveEdge | null {
  const window = liveWindowFromState(state);
  if (!window) return null;
  const latency = config?.resolveLiveLatency?.(state.presentation.get(), liveTrackId(state)) ?? 0;
  return { ...window, liveEdgeStart: Math.max(window.start, window.end - latency) };
}
