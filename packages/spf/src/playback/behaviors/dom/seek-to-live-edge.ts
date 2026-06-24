/**
 * Keep the playhead in the live window, via a two-state reactor gated on the
 * preconditions for "we know where live is":
 *
 * - **`inactive`** — no media element, no (published, hence open) MediaSource,
 *   or no live edge (`getLiveEdge` is `null`: VOD, ended, or unresolved). Idle.
 * - **`live`** — preconditions met. `entry` seeks `currentTime` once to the
 *   target live latency behind the edge (clamped to the window start) so
 *   playback begins near the edge and the loader dispatches an in-window range;
 *   `effects` runs the window-exit guard.
 *
 * The two pieces split along the axis a future DVR / EVENT mode will care about:
 * the **one-time seek** (`entry`) is the *live-specific* behavior — jump to the
 * edge on load; a DVR mode makes it conditional (start in place). The
 * **window-exit guard** (`effects`) is the *general windowed-live* behavior —
 * applies to sliding-window live, DVR, and EVENT alike. Because the seek is an
 * `entry`, it fires once per entry into `live`; a source change exits to
 * `inactive`, so the next source re-seeks (no closure latch to reset).
 *
 * Window-exit guard: while playing (`!paused && !seeking && readyState > 0`),
 * reposition to the live edge when the playhead falls *outside* the sliding
 * window — a paused playhead the window slid past (caught on the `playing`
 * resume) or playback that fell behind on poor network (caught on the effect's
 * window-update re-fire, since `timeupdate` stops once a stall freezes
 * `currentTime`). In-window pause / DVR scrub-back are left untouched (the
 * `window-exit` reposition policy).
 *
 * The latency comes from the injected `resolveLiveLatency` seam (HLS:
 * `HOLD-BACK`), so this behavior carries no delivery-format specifics. The
 * MediaSource precondition ties the seek to the declared seekable range:
 * `sync-live-seekable-range` (composed before this) declares it while the
 * MediaSource is open, so seeks land in-window (a seek outside `seekable` is
 * clamped). `setupMediaSource` publishes `context.mediaSource` only once open,
 * so the signal's *presence* is the open gate — no `readyState` re-check.
 */
import { listen } from '@videojs/utils/dom';
import type { Behavior } from '../../../core/composition/create-composition';
import { createMachineReactor, type Reactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';
import { getLiveEdge, type LiveEdge, type ResolveLiveLatency } from '../../primitives/live-window';

/**
 * Tolerance (seconds) around the window edges before the guard repositions, so
 * boundary / floating-point noise doesn't trigger a spurious seek.
 */
const REPOSITION_TOLERANCE = 0.1;

/**
 * When the live-window guard repositions the playhead to the live edge.
 * - `'window-exit'` (default; DVR model): only when the playhead is outside the
 *   sliding window. In-window pause / scrub-back is left untouched.
 * - `'on-resume'`: edge-only — always snap to the live edge on resume. A future
 *   use-case variant (live-edge-only mode); not yet implemented.
 */
export type LiveRepositionPolicy = 'window-exit' | 'on-resume';

export interface SeekToLiveEdgeState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

export interface SeekToLiveEdgeContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
}

export interface SeekToLiveEdgeConfig {
  /** Reposition policy for the live-window guard. Defaults to `'window-exit'`. */
  repositionPolicy?: LiveRepositionPolicy;
  /**
   * Resolve the target live latency (seconds the playhead should trail the live
   * edge) for the timeline-bearing track. Injected by the engine so the latency
   * rule stays format-specific (HLS: `HOLD-BACK`, default 3× target duration;
   * DASH would read `suggestedPresentationDelay`) while this behavior stays
   * neutral. Absent → `0` (seek straight to the edge).
   */
  resolveLiveLatency?: ResolveLiveLatency;
}

type SeekToLiveEdgeFsmState = 'inactive' | 'live';

/**
 * `'live'` once the seek preconditions hold: a media element, a (published →
 * open) MediaSource, and a derivable live edge. `'inactive'` otherwise.
 */
function deriveState(
  mediaElement: HTMLMediaElement | undefined,
  mediaSource: MediaSource | undefined,
  edge: LiveEdge | null
): SeekToLiveEdgeFsmState {
  return mediaElement && mediaSource && edge ? 'live' : 'inactive';
}

function seekToLiveEdgeSetup({
  state,
  context,
  config,
}: {
  state: {
    presentation: ReadonlySignal<SeekToLiveEdgeState['presentation']>;
    selectedVideoTrackId?: ReadonlySignal<SeekToLiveEdgeState['selectedVideoTrackId']>;
    selectedAudioTrackId?: ReadonlySignal<SeekToLiveEdgeState['selectedAudioTrackId']>;
  };
  context: {
    mediaElement: ReadonlySignal<SeekToLiveEdgeContext['mediaElement']>;
    mediaSource: ReadonlySignal<SeekToLiveEdgeContext['mediaSource']>;
  };
  config?: SeekToLiveEdgeConfig;
}): Reactor<SeekToLiveEdgeFsmState | 'destroying' | 'destroyed'> {
  const repositionPolicy = config?.repositionPolicy ?? 'window-exit';

  const derivedStateSignal = computed(() =>
    deriveState(context.mediaElement.get(), context.mediaSource.get(), getLiveEdge({ state, config }))
  );

  return createMachineReactor<SeekToLiveEdgeFsmState>({
    initial: 'inactive',
    monitor: () => derivedStateSignal.get(),
    states: {
      inactive: {},

      live: {
        // One-time seek into the window so the loader dispatches an in-window
        // range and preload shows the right frame. Fires once per entry into
        // `live`; a source change exits to `inactive`, so a new source re-seeks.
        // Live-specific — a future DVR mode skips this (starts in place).
        entry: () => {
          const mediaElement = context.mediaElement.get();
          const edge = getLiveEdge({ state, config });
          // The monitor guarantees both while in `live`.
          if (!mediaElement || !edge) return;
          if (mediaElement.currentTime < edge.liveEdgeStart) {
            mediaElement.currentTime = edge.liveEdgeStart;
          }
        },

        // Window-exit guard. Re-fires on each window update (the primary
        // trigger — `timeupdate` stops while a stall freezes `currentTime`) and
        // on the secondary media-event listeners. Tracks `mediaElement` too, so
        // the listeners re-bind if the element identity changes.
        effects: () => {
          const mediaElement = context.mediaElement.get();
          const edge = getLiveEdge({ state, config });
          if (!mediaElement || !edge) return;

          const { start: windowStart, end: windowEnd, liveEdgeStart } = edge;
          const reposition = () => {
            // `on-resume` (edge-only) is a future use-case variant; only the DVR
            // `window-exit` policy is implemented today.
            if (repositionPolicy !== 'window-exit') return;
            if (mediaElement.paused || mediaElement.seeking || mediaElement.readyState === 0) return;
            const { currentTime } = mediaElement;
            if (currentTime < windowStart - REPOSITION_TOLERANCE || currentTime > windowEnd + REPOSITION_TOLERANCE) {
              mediaElement.currentTime = liveEdgeStart;
            }
          };
          reposition();
          const removePlaying = listen(mediaElement, 'playing', reposition);
          const removeTimeupdate = listen(mediaElement, 'timeupdate', reposition);
          const removeSeeked = listen(mediaElement, 'seeked', reposition);
          return () => {
            removePlaying();
            removeTimeupdate();
            removeSeeked();
          };
        },
      },
    },
  });
}

/**
 * Manual `Behavior<>` literal (like `anchorLiveTracks` /
 * `calculatePresentationDuration`): declares only `presentation` in stateKeys
 * while reading `selectedVideoTrackId` defensively (contributed by
 * `switchVideoTrack`), so it composes without a stateKeys/type conflict.
 */
export const seekToLiveEdge: Behavior<
  { presentation: ReadonlySignal<SeekToLiveEdgeState['presentation']> },
  {
    mediaElement: ReadonlySignal<SeekToLiveEdgeContext['mediaElement']>;
    mediaSource: ReadonlySignal<SeekToLiveEdgeContext['mediaSource']>;
  },
  SeekToLiveEdgeConfig
> = {
  stateKeys: ['presentation'],
  contextKeys: ['mediaElement', 'mediaSource'],
  setup: seekToLiveEdgeSetup,
};
