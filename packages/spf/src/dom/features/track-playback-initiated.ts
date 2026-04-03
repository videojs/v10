import { listen } from '@videojs/utils/dom';
import type { Reactor } from '../../core/create-reactor';
import { createReactor } from '../../core/create-reactor';
import { computed, type Signal, untrack, update } from '../../core/signals/primitives';

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
type PlaybackInitiatedStatus = 'preconditions-unmet' | 'monitoring' | 'playback-initiated';

function deriveStatus(state: PlaybackInitiatedState, owners: PlaybackInitiatedOwners): PlaybackInitiatedStatus {
  if (!owners.mediaElement || !state.presentation?.url) return 'preconditions-unmet';
  if (state.playbackInitiated) return 'playback-initiated';
  return 'monitoring';
}

/**
 * Track whether playback has been initiated for the current presentation URL.
 *
 * A three-state Reactor FSM driven by `state.playbackInitiated` and the
 * `deriveStatus` pattern:
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
}): Reactor<PlaybackInitiatedStatus | 'destroying' | 'destroyed', object> {
  const derivedStatusSignal = computed(() => deriveStatus(state.get(), owners.get()));
  const mediaElementSignal = computed(() => owners.get().mediaElement);
  const urlSignal = computed(() => state.get().presentation?.url);

  return createReactor<PlaybackInitiatedStatus, object>({
    initial: 'preconditions-unmet',
    context: {},
    always: [
      ({ status, transition }) => {
        const target = derivedStatusSignal.get();
        if (target !== status) transition(target);
      },
    ],
    states: {
      'preconditions-unmet': [],

      monitoring: [
        // Enter-once: check if already playing; otherwise listen for play.
        () => {
          const el = untrack(() => mediaElementSignal.get())!;
          update(state, { playbackInitiated: !el.paused } as Partial<S>);
          return listen(el, 'play', () => {
            update(state, { playbackInitiated: !el.paused } as Partial<S>);
          });
        },
      ],

      'playback-initiated': [
        // Reactive: tracks element and URL while initiated. When either changes,
        // the effect re-runs — the exit cleanup fires first, resetting
        // state.playbackInitiated to false. deriveStatus then returns 'monitoring'
        // on the next microtask, and the always monitor drives the transition.
        //
        // This covers both the preconditions-lost path (element/URL → undefined,
        // which also triggers a deriveStatus → 'preconditions-unmet' transition)
        // and the URL-change / element-swap path (preconditions still met but
        // values changed, handled entirely by this effect's cleanup).
        () => {
          mediaElementSignal.get(); // tracked — re-run on element change
          urlSignal.get(); // tracked — re-run on URL change
          return () => update(state, { playbackInitiated: false } as Partial<S>);
        },
      ],
    },
  });
}
