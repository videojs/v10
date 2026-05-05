import type { Reactor } from '../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, type Signal, update } from '../../core/signals/primitives';
import { parseMultivariantPlaylist } from '../../media/hls/parse-multivariant';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../media/types';
import { fetchResolvable, getResponseText } from '../../network/fetch';

/**
 * State shape for presentation resolution.
 *
 * `presentation` is a single slot whose value may or may not be resolved.
 * A caller writes `{ url }`; resolvePresentation parses the manifest and
 * populates the rest in place.
 */
export interface PresentationState {
  presentation?: MaybeResolvedPresentation;
  preload?: 'auto' | 'metadata' | 'none' | undefined;
  /** True once the user has initiated playback — enables resolution regardless of preload. */
  playbackInitiated?: boolean;
}

/**
 * Determines if resolution conditions are met based on preload policy and playback state.
 *
 * Resolution conditions:
 * - State-driven: preload is 'auto' or 'metadata'
 * - Playback-driven: playbackInitiated is true
 */
export function shouldResolve(state: PresentationState): boolean {
  const { preload, playbackInitiated } = state;
  return (
    // State-driven: preload allows (auto/metadata)
    ['auto', 'metadata'].includes(preload as any) ||
    // Playback-driven: user has initiated playback
    !!playbackInitiated
  );
}

/**
 * True when there's a presentation with a URL that hasn't been resolved yet.
 */
export function canResolve(
  state: PresentationState
): state is PresentationState & { presentation: MaybeResolvedPresentation } {
  return !!state.presentation?.url && !isResolvedPresentation(state.presentation);
}

export type ResolvePresentationState = 'preconditions-unmet' | 'idle' | 'resolving' | 'resolved';

/**
 * Derives the current state from current state conditions.
 *
 * States are mutually exclusive and exhaustive:
 * - `'preconditions-unmet'`: no presentation, or presentation has no URL
 * - `'idle'`: URL present, unresolved, shouldResolve not met
 * - `'resolving'`: URL present, unresolved, shouldResolve met
 * - `'resolved'`: presentation has been resolved
 */
function deriveState(state: PresentationState): ResolvePresentationState {
  const { presentation } = state;
  if (!presentation?.url) return 'preconditions-unmet';
  if (isResolvedPresentation(presentation)) return 'resolved';
  return shouldResolve(state) ? 'resolving' : 'idle';
}

/**
 * Resolves an unresolved presentation into a parsed `Presentation`.
 *
 * FSM driven by `deriveState` — a single `always` monitor keeps the state in
 * sync with conditions at all times. `'resolving'` additionally runs the fetch
 * task and returns an AbortController so the framework aborts it on state exit.
 *
 * @example
 * const reactor = resolvePresentation({ state });
 * // later:
 * reactor.destroy();
 */
export function resolvePresentation<S extends PresentationState>({
  state,
}: {
  state: Signal<S>;
}): Reactor<ResolvePresentationState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(state.get()));

  return createMachineReactor<ResolvePresentationState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},
      idle: {},
      resolving: {
        // Entry: start fetch on state entry; return AbortController so the
        // framework aborts the in-flight request on state exit.
        entry: () => {
          const presentation = state.get().presentation!;
          const ac = new AbortController();

          fetchResolvable(presentation, { signal: ac.signal })
            .then((response) => getResponseText(response))
            .then((text) => {
              const parsed = parseMultivariantPlaylist(text, presentation);
              update(state, { presentation: parsed } as Partial<S>);
            })
            .catch((error) => {
              if (error instanceof Error && error.name === 'AbortError') return;
              throw error;
            });

          return ac;
        },
      },
      resolved: {},
    },
  });
}
