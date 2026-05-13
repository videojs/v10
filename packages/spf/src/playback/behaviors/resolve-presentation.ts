/**
 * **Resolve an unresolved presentation by fetching and parsing its manifest.**
 *
 * Reads `state.presentation`; when it holds `{ url }` (unresolved) and the
 * preload / load-activation gate is met, fetches the manifest, parses it via
 * `config.parsePresentation` (default: HLS multivariant playlist parser), and
 * writes the resolved `Presentation` back to the same slot.
 *
 * Source-identity-driven, expressed as a 4-state machine:
 *
 * ```
 * 'preconditions-unmet' → 'idle' → 'resolving' → 'resolved'
 * ```
 *
 * - `'preconditions-unmet'`: no presentation, or presentation has no URL.
 * - `'idle'`: URL present, unresolved, gate unmet (blocking preload + no
 *   load-activation). Waits for the gate to open.
 * - `'resolving'`: URL present, unresolved, gate met. Entry starts the fetch
 *   and returns the AbortController — the reactor calls `.abort()` on state
 *   exit, so source change / gate-close / destroy all cancel cleanly.
 * - `'resolved'`: `state.presentation` holds a resolved `Presentation`.
 *
 * Gate semantics live in `isBlockingPreload` (`media/utils/preload`):
 * a preload value blocks resolution if falsy or in `config.blockingPreloads`
 * (default `['none']`). `state.loadActivated` is an override — true bypasses
 * the preload gate entirely.
 *
 * Multi-writer with the engine adapter, which writes the initial unresolved
 * `{ url }` to `state.presentation` from src input. Different domains
 * (config-input vs. derived state via fetch) — legitimate multi-writer.
 */
import { defineBehavior } from '../../core/composition/create-composition';
import type { Reactor } from '../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import { parseMultivariantPlaylist } from '../../media/hls/parse-multivariant';
import { isResolvedPresentation, type MaybeResolvedPresentation, type Presentation } from '../../media/types';
import { isBlockingPreload } from '../../media/utils/preload';
import { fetchResolvable, getResponseText } from '../../network/fetch';

export interface PresentationState {
  presentation?: MaybeResolvedPresentation;
  preload?: 'auto' | 'metadata' | 'none' | undefined;
  /** True once a preload-overriding event has fired for the current source — enables resolution regardless of preload. */
  loadActivated?: boolean;
}

export type ParsePresentation = (text: string, presentation: MaybeResolvedPresentation) => Presentation;

export interface ResolvePresentationConfig {
  /**
   * Preload values that block initial resolution. Defaults to `['none']`.
   * Falsy preload (undefined / empty) always blocks regardless of this list.
   */
  blockingPreloads?: readonly string[];
  /**
   * Parses a manifest body into a resolved `Presentation`. Defaults to the
   * HLS multivariant-playlist parser; engines for other formats (DASH, etc.)
   * supply their own.
   */
  parsePresentation?: ParsePresentation;
}

export type ResolvePresentationState = 'preconditions-unmet' | 'idle' | 'resolving' | 'resolved';

function deriveState(
  presentation: MaybeResolvedPresentation | undefined,
  preload: PresentationState['preload'],
  loadActivated: boolean | undefined,
  blockingPreloads: readonly string[] | undefined
): ResolvePresentationState {
  if (!presentation?.url) return 'preconditions-unmet';
  if (isResolvedPresentation(presentation)) return 'resolved';
  const gateOpen = !!loadActivated || !isBlockingPreload(preload, blockingPreloads);
  return gateOpen ? 'resolving' : 'idle';
}

function resolvePresentationSetup({
  state,
  config,
}: {
  state: {
    presentation: Signal<PresentationState['presentation']>;
    preload: ReadonlySignal<PresentationState['preload']>;
    loadActivated: ReadonlySignal<PresentationState['loadActivated']>;
  };
  config?: ResolvePresentationConfig;
}): Reactor<ResolvePresentationState | 'destroying' | 'destroyed'> {
  const parsePresentation = config?.parsePresentation ?? parseMultivariantPlaylist;
  const blockingPreloads = config?.blockingPreloads;

  const derivedStateSignal = computed(() =>
    deriveState(state.presentation.get(), state.preload.get(), state.loadActivated.get(), blockingPreloads)
  );

  return createMachineReactor<ResolvePresentationState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},
      idle: {},
      resolving: {
        entry: () => {
          const presentation = state.presentation.get()!;
          const ac = new AbortController();

          fetchResolvable(presentation, { signal: ac.signal })
            .then((response) => getResponseText(response))
            .then((text) => {
              const parsed = parsePresentation(text, presentation);
              state.presentation.set(parsed);
            })
            .catch((error) => {
              if (error instanceof Error && error.name === 'AbortError') return;
              // TODO(error-management): route to a state-error slot once one exists.
              console.error('[resolvePresentation] manifest fetch/parse failed:', error);
            });

          return ac;
        },
      },
      resolved: {},
    },
  });
}

export const resolvePresentation = defineBehavior({
  stateKeys: ['presentation', 'preload', 'loadActivated'],
  contextKeys: [],
  setup: resolvePresentationSetup,
});
