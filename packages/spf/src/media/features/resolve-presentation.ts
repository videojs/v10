import type { Reactor } from '../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, type Signal, update } from '../../core/signals/primitives';
import { fetchResolvable, getResponseText } from '../../dom/network/fetch';
import { parseMultivariantPlaylist } from '../hls/parse-multivariant';
import type { AddressableObject, Presentation } from '../types';

/**
 * Unresolved presentation - has a URL but no data yet.
 * Identical to AddressableObject per user requirement.
 */
export type UnresolvedPresentation = AddressableObject;

/**
 * State shape for presentation resolution.
 */
export interface PresentationState {
  presentation?: UnresolvedPresentation | Presentation | undefined;
  preload?: 'auto' | 'metadata' | 'none' | undefined;
  /** True once the user has initiated playback — enables resolution regardless of preload. */
  playbackInitiated?: boolean;
}

/**
 * Type guard to check if presentation is unresolved.
 */
export function isUnresolved(
  presentation: UnresolvedPresentation | Presentation | undefined
): presentation is UnresolvedPresentation {
  return presentation !== undefined && 'url' in presentation && !('id' in presentation);
}

export function canResolve(
  state: PresentationState
): state is PresentationState & { presentation: UnresolvedPresentation } {
  return isUnresolved(state.presentation);
}

/**
 * Determines if resolution conditions are met based on preload policy and playback state.
 *
 * Resolution conditions:
 * - State-driven: preload is 'auto' or 'metadata'
 * - Playback-driven: playbackInitiated is true
 *
 * @param state - Current presentation state
 * @returns true if resolution conditions are met
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

export type ResolvePresentationState = 'preconditions-unmet' | 'idle' | 'resolving' | 'resolved';

/**
 * Derives the correct state from current state conditions.
 *
 * States are mutually exclusive and exhaustive:
 * - `'preconditions-unmet'`: no presentation, or presentation has no URL
 * - `'idle'`:     URL present, unresolved (no id), shouldResolve not met
 * - `'resolving'`: URL present, unresolved (no id), shouldResolve met
 * - `'resolved'`:  URL present, resolved (has id)
 */
function deriveState(state: PresentationState): ResolvePresentationState {
  const { presentation } = state;
  if (!presentation || !('url' in presentation)) return 'preconditions-unmet';
  if ('id' in presentation) return 'resolved';
  return shouldResolve(state) ? 'resolving' : 'idle';
}

/**
 * Resolves unresolved presentations using reactive composition.
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
          const presentation = state.get().presentation as UnresolvedPresentation;
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
