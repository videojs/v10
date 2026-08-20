/**
 * Resolve the live window from engine state — the single call site the
 * seek-to-live-edge and live-seekable-range behaviors share, so their window
 * derivation can't drift apart.
 *
 * The window is the **intersection over the selected A/V tracks'** windows
 * (`max` of starts, `min` of ends): publication skew between the two playlists
 * shrinks the window to what both can actually serve, and the `max` also clamps
 * the legitimate *negative* early `startTime` of a non-reference track whose
 * window precedes the join point (presentation-0) — see
 * `internal/design/spf/live-presentation-timeline-model.md` (Phase 2 window
 * math). With one selected type (video-only / audio-only) its window stands
 * alone.
 *
 * Reads signals lazily — call it inside a reactive context (an effect) so the
 * read tracks `presentation` + the selected-track ids.
 */
import type { ReadonlySignal } from '../../core/signals/primitives';
import { type LiveWindow, liveWindowFor } from '../../media/live-window';
import type { MaybeResolvedPresentation, TrackType } from '../../media/types';
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

/**
 * One type's window: the selected track's when it's resolved, else any resolved
 * track of the type. The fallback keeps the window from blinking to `null`
 * mid ABR / user switch — all renditions of a type are time-aligned and share
 * the anchor, so a deselected track's window may trail live by up to one reload
 * during the switch gap (acceptable; the selected track's fresh window resumes
 * the moment it resolves). A null blink would flip `seekToLiveEdge` out of
 * `live` and stall the seekable-range writer.
 */
function liveWindowForType(
  presentation: MaybeResolvedPresentation | undefined,
  selectedId: string | undefined,
  type: TrackType
): LiveWindow | null {
  if (!presentation || selectedId === undefined) return null;
  const selected = liveWindowFor(presentation, selectedId);
  if (selected) return selected;
  for (const track of getTracksByType(presentation, type)) {
    const window = liveWindowFor(presentation, track.id);
    if (window) return window;
  }
  return null;
}

export function liveWindowFromState(state: LiveWindowState): LiveWindow | null {
  const presentation = state.presentation.get();
  const video = liveWindowForType(presentation, state.selectedVideoTrackId?.get(), 'video');
  const audio = liveWindowForType(presentation, state.selectedAudioTrackId?.get(), 'audio');
  if (video && audio) {
    const start = Math.max(video.start, audio.start);
    const end = Math.min(video.end, audio.end);
    // A degenerate intersection (disjoint windows — one playlist stalled a full
    // window behind the other) means there is no position both types can serve:
    // no live edge, rather than an invented one.
    return start < end ? { start, end } : null;
  }
  return video ?? audio;
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
