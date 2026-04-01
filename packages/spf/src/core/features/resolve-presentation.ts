import { fetchResolvable, getResponseText } from '../../dom/network/fetch';
import type { Reactor } from '../create-reactor';
import { createReactor } from '../create-reactor';
import { parseMultivariantPlaylist } from '../hls/parse-multivariant';
import { computed, type Signal, update } from '../signals/primitives';
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

export type ResolvePresentationStatus = 'idle' | 'resolving';

/**
 * Resolves unresolved presentations using reactive composition.
 *
 * FSM: `'idle'` ↔ `'resolving'`
 *
 * - `'idle'` — waits for `canResolve && shouldResolve`, then starts the fetch
 *   and transitions to `'resolving'`.
 * - `'resolving'` — in-flight fetch; exit cleanup aborts it.
 *
 * Triggers resolution when:
 * - State-driven: Unresolved presentation + preload allows (auto/metadata)
 * - Playback-driven: playbackInitiated is true
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
}): Reactor<ResolvePresentationStatus | 'destroying' | 'destroyed', object> {
  const canResolveSignal = computed(() => canResolve(state.get()));
  const shouldResolveSignal = computed(() => shouldResolve(state.get()));

  let abortController: AbortController | null = null;

  return createReactor<ResolvePresentationStatus, object>({
    initial: 'idle',
    context: {},
    states: {
      idle: [
        ({ transition }) => {
          if (!canResolveSignal.get() || !shouldResolveSignal.get()) return;

          const presentation = state.get().presentation as UnresolvedPresentation;
          abortController = new AbortController();

          fetchResolvable(presentation, { signal: abortController.signal })
            .then((response) => getResponseText(response))
            .then((text) => {
              const parsed = parseMultivariantPlaylist(text, presentation);
              update(state, { presentation: parsed } as Partial<S>);
            })
            .catch((error) => {
              if (error instanceof Error && error.name === 'AbortError') return;
              throw error;
            })
            .finally(() => {
              abortController = null;
              transition('idle');
            });

          transition('resolving');
        },
      ],

      resolving: [
        () => () => {
          abortController?.abort();
          abortController = null;
        },
      ],
    },
  });
}
