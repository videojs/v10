import { fetchResolvable, getResponseText } from '../../dom/network/fetch';
import { parseMultivariantPlaylist } from '../hls/parse-multivariant';
import { effect } from '../signals/effect';
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

/**
 * Resolves unresolved presentations using reactive composition.
 *
 * Triggers resolution when:
 * - State-driven: Unresolved presentation + preload allows (auto/metadata)
 * - Playback-driven: playbackInitiated is true
 *
 * @example
 * ```ts
 * const state = signal({ presentation: undefined, preload: 'auto', playbackInitiated: false });
 *
 * const cleanup = resolvePresentation({ state });
 *
 * // State-driven: resolves immediately when preload allows
 * state.set({ ...state.get(), presentation: { url: 'http://example.com/playlist.m3u8' } });
 *
 * // Playback-driven: resolves when playbackInitiated is set
 * state.set({ ...state.get(), preload: 'none', presentation: { url: '...' }, playbackInitiated: true });
 * ```
 */
export function resolvePresentation<S extends PresentationState>({ state }: { state: Signal<S> }): () => void {
  const canResolveSignal = computed(() => canResolve(state.get()));
  const shouldResolveSignal = computed(() => shouldResolve(state.get()));

  let resolving = false;
  let abortController: AbortController | null = null;

  const cleanupEffect = effect(() => {
    if (!canResolveSignal.get() || !shouldResolveSignal.get() || resolving) return;

    const presentation = state.get().presentation as UnresolvedPresentation;
    resolving = true;
    abortController = new AbortController();

    fetchResolvable(presentation, { signal: abortController.signal })
      .then((response) => getResponseText(response))
      .then((text) => {
        const parsed = parseMultivariantPlaylist(text, presentation);
        const patch: Partial<PresentationState> = { presentation: parsed };
        update(state, patch);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        throw error;
      })
      .finally(() => {
        resolving = false;
        abortController = null;
      });
  });

  return () => {
    abortController?.abort();
    cleanupEffect();
  };
}
