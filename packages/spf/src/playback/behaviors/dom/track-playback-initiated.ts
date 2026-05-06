import { listen } from '@videojs/utils/dom';
import { type ContextSignals, defineBehavior, type StateSignals } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, snapshot } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';

/**
 * State shape for playback initiation tracking.
 */
export interface PlaybackInitiatedState {
  /** True once play has been requested for the current presentation URL. */
  playbackInitiated?: boolean;
  /** Current presentation — URL is used to detect source changes. */
  presentation?: MaybeResolvedPresentation;
}

/**
 * Context shape for playback initiation tracking.
 */
export interface PlaybackInitiatedContext {
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
  context: PlaybackInitiatedContext
): 'preconditions-unmet' | 'monitoring' | 'playback-initiated' {
  if (!context.mediaElement || !state.presentation?.url) return 'preconditions-unmet';
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
 * const reactor = trackPlaybackInitiated.setup({ state, context });
 * // later:
 * reactor.destroy();
 */
function trackPlaybackInitiatedSetup({
  state,
  context,
}: {
  state: StateSignals<PlaybackInitiatedState>;
  context: ContextSignals<PlaybackInitiatedContext>;
}): Reactor<'preconditions-unmet' | 'monitoring' | 'playback-initiated' | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(snapshot(state), snapshot(context)));
  const mediaElementSignal = computed(() => context.mediaElement.get());
  const urlSignal = computed(() => state.presentation.get()?.url);

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
          state.playbackInitiated.set(!el.paused);
          return listen(el, 'play', () => {
            state.playbackInitiated.set(!el.paused);
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
          return () => state.playbackInitiated.set(false);
        },
      },
    },
  });
}

export const trackPlaybackInitiated = defineBehavior({
  stateKeys: ['playbackInitiated', 'presentation'],
  contextKeys: ['mediaElement'],
  setup: trackPlaybackInitiatedSetup,
});
