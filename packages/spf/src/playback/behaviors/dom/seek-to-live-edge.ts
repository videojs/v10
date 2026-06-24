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
 * Window-exit guard: while playing (not paused, not mid-seek), reposition to the
 * live edge when the playhead has fallen behind the window start. Two triggers:
 * the **window-update re-fire** (the guard reads the live edge, so each reload /
 * slide re-runs it — this catches a stall, where `timeupdate` stops but the
 * playlist keeps reloading) and a **`play` listener** for immediate reactivity on
 * resume, since the reload interval can be seconds. `play`, not `playing`: after
 * a long pause the playhead sits behind the window at an unseekable position,
 * where the browser stalls and `playing` never fires; `play` fires on the
 * paused→false transition regardless, so we snap before the stall. In-window
 * pause / DVR scrub-back are left untouched.
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
import { computed, peek, type ReadonlySignal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';
import { getLiveEdge, type LiveEdge, type ResolveLiveLatency } from '../../primitives/live-window';

/**
 * Tolerance (seconds) around the window edges before the guard repositions, so
 * boundary / floating-point noise doesn't trigger a spurious seek.
 */
const REPOSITION_TOLERANCE = 0.1;

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
          // The monitor guarantees a media element + live edge while in `live`.
          const mediaElement = context.mediaElement.get()!;
          const { liveEdgeStart } = getLiveEdge({ state, config })!;
          if (mediaElement.currentTime < liveEdgeStart) {
            mediaElement.currentTime = liveEdgeStart;
          }
        },

        // Window-exit guard. Repositions to the live edge when the playhead has
        // fallen behind the window start, while playing. Two triggers: this
        // effect's window-update re-fire (it reads the live edge, so each reload
        // re-runs it — catches a stall, where `timeupdate` is silent) and a
        // `play` listener for immediate reactivity on resume.
        effects: () => {
          // Read the live edge first — the only tracked dependency — so window
          // slides keep re-firing this effect even while paused. Bailing before
          // it (on paused) would drop the dependency and the effect would go
          // inert, missing the next slide. The monitor guarantees the edge while
          // in `live`; the media element is read untracked (the window update,
          // not element identity, is the re-fire trigger).
          const { start: windowStart, liveEdgeStart } = getLiveEdge({ state, config })!;
          const mediaElement = peek(context.mediaElement)!;
          const reposition = () => {
            // Don't yank a paused viewer or fight an in-flight seek (DVR scrub-back).
            if (mediaElement.paused || mediaElement.seeking) return;
            if (mediaElement.currentTime < windowStart - REPOSITION_TOLERANCE) {
              mediaElement.currentTime = liveEdgeStart;
            }
          };
          reposition();
          // `play` (not `playing`): a slid-past playhead is at an unseekable
          // position where `playing` would stall and never fire; `play` fires on
          // unpause regardless, so we snap before the stall.
          return listen(mediaElement, 'play', reposition);
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
