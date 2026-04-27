import type { Reactor } from '../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, type Signal, update } from '../../core/signals/primitives';
import { parseMultivariantPlaylist } from '../../media/hls/parse-multivariant';
import type { Presentation } from '../../media/types';
import { fetchResolvable, getResponseText } from '../../network/fetch';

/**
 * State shape for presentation resolution.
 *
 * The lifecycle is split across two slots:
 * - `presentationUrl` — the input. Caller writes a URL; resolvePresentation
 *   reads it and fetches/parses the manifest.
 * - `presentation` — the output. resolvePresentation writes the parsed
 *   `Presentation` here on success.
 */
export interface PresentationState {
  presentationUrl?: string;
  presentation?: Presentation;
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
 * True when there's a URL to resolve and no resolved presentation yet.
 */
export function canResolve(state: PresentationState): state is PresentationState & { presentationUrl: string } {
  return !!state.presentationUrl && !state.presentation;
}

export type ResolvePresentationState = 'preconditions-unmet' | 'idle' | 'resolving' | 'resolved';

/**
 * Derives the current state from current state conditions.
 *
 * States are mutually exclusive and exhaustive:
 * - `'preconditions-unmet'`: no presentationUrl
 * - `'idle'`: presentationUrl present, not yet resolved (or resolved to a stale URL), shouldResolve not met
 * - `'resolving'`: presentationUrl present, not yet resolved (or resolved to a stale URL), shouldResolve met
 * - `'resolved'`: presentation present and matches presentationUrl
 *
 * Setting `presentationUrl` to a different URL after resolution transitions
 * back through `'resolving'` to refetch the new manifest.
 */
function deriveState(state: PresentationState): ResolvePresentationState {
  if (!state.presentationUrl) {
    return state.presentation ? 'resolved' : 'preconditions-unmet';
  }
  if (state.presentation?.url === state.presentationUrl) return 'resolved';
  return shouldResolve(state) ? 'resolving' : 'idle';
}

/**
 * Resolves a presentation URL into a parsed `Presentation`.
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
          const url = state.get().presentationUrl!;
          const ac = new AbortController();

          fetchResolvable({ url }, { signal: ac.signal })
            .then((response) => getResponseText(response))
            .then((text) => {
              const parsed = parseMultivariantPlaylist(text, { url });
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
