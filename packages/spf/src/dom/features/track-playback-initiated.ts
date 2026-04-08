import { listen } from '@videojs/utils/dom';
import type { Reactor } from '../../core/create-machine-reactor';
import { createMachineReactor } from '../../core/create-machine-reactor';
import { computed, type Signal, update } from '../../core/signals/primitives';

/**
 * State shape for playback initiation tracking.
 */
export interface PlaybackInitiatedState {
  /** True once play has been requested for the current presentation URL. */
  playbackInitiated?: boolean;
  /** Current presentation — URL is used to detect source changes. */
  presentation?: { url?: string };
}

/**
 * Owners shape for playback initiation tracking.
 */
export interface PlaybackInitiatedOwners {
  mediaElement?: HTMLMediaElement | undefined;
}

/**
 * FSM states for playback initiation tracking.
 *
 * ```
 * 'preconditions-unmet' ──── element + URL ────→ 'monitoring'
 *         ↑                        ↑                  │
 *         │   preconditions lost   │             play / !paused
 *         │                        │                  ↓
 *         └────────────── 'playback-initiated' ←──────┘
 *                (exit cleanup resets state.playbackInitiated → false)
 *
 * any state ──── destroy() ────→ 'destroying' ────→ 'destroyed'
 * ```
 */
function deriveState(
  state: PlaybackInitiatedState,
  owners: PlaybackInitiatedOwners
): 'preconditions-unmet' | 'monitoring' | 'playback-initiated' {
  if (!owners.mediaElement || !state.presentation?.url) return 'preconditions-unmet';
  if (state.playbackInitiated) return 'playback-initiated';
  return 'monitoring';
}

/**
 * Track whether playback has been initiated for the current presentation URL.
 *
 * A three-state Reactor FSM driven by `state.playbackInitiated` and the
 * `deriveState` pattern:
 * - `'preconditions-unmet'` — no element or URL yet; no effects.
 * - `'monitoring'` — checks `!el.paused` on entry; listens for `play`.
 * - `'playback-initiated'` — tracks element and URL; exit cleanup resets
 *   `state.playbackInitiated` to `false` on any change or lost preconditions.
 *
 * @example
 * const reactor = trackPlaybackInitiated({ state, owners });
 * // later:
 * reactor.destroy();
 */
export function trackPlaybackInitiated<S extends PlaybackInitiatedState, O extends PlaybackInitiatedOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): Reactor<'preconditions-unmet' | 'monitoring' | 'playback-initiated' | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(state.get(), owners.get()));
  const mediaElementSignal = computed(() => owners.get().mediaElement);
  const urlSignal = computed(() => state.get().presentation?.url);

  return createMachineReactor<'preconditions-unmet' | 'monitoring' | 'playback-initiated'>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      monitoring: {
        // Entry: check if already playing; otherwise listen for play.
        // The fn body is automatically untracked — el is read at entry time only.
        entry: () => {
          const el = mediaElementSignal.get()!;
          update(state, { playbackInitiated: !el.paused } as Partial<S>);
          return listen(el, 'play', () => {
            update(state, { playbackInitiated: !el.paused } as Partial<S>);
          });
        },
      },

      'playback-initiated': {
        // Reaction: tracks element and URL while initiated. When either changes,
        // the effect re-runs — the exit cleanup fires first, resetting
        // state.playbackInitiated to false. deriveState then returns 'monitoring'
        // on the next microtask, and the always monitor drives the transition.
        //
        // This covers both the preconditions-lost path (element/URL → undefined,
        // which also triggers a deriveState → 'preconditions-unmet' transition)
        // and the URL-change / element-swap path (preconditions still met but
        // values changed, handled entirely by this effect's cleanup).
        effects: () => {
          mediaElementSignal.get(); // tracked — re-run on element change
          urlSignal.get(); // tracked — re-run on URL change
          return () => update(state, { playbackInitiated: false } as Partial<S>);
        },
      },
    },
  });
}
