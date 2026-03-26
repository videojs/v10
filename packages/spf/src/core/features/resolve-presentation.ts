import { fetchResolvable, getResponseText } from '../../dom/network/fetch';
import { parseMultivariantPlaylist } from '../hls/parse-multivariant';
import { effect } from '../signals/effect';
import { computed, type Signal, update } from '../signals/primitives';
import type { AddressableObject, MediaElementLike, Presentation } from '../types';

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
 * Mutable platform objects.
 */
export interface PlatformOwners {
  mediaElement?: MediaElementLike | undefined;
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
 * Syncs preload attribute from mediaElement to state.
 *
 * Watches the owners signal for mediaElement changes and copies the
 * preload attribute to state.
 *
 * @param state - State signal
 * @param owners - Owners signal
 * @returns Cleanup function to stop syncing
 */
export function syncPreloadAttribute<S extends PresentationState, O extends PlatformOwners>(
  state: Signal<S>,
  owners: Signal<O>
): () => void {
  const mediaElement = computed(() => owners.get().mediaElement);
  return effect(() => {
    // Only infer preload from the element when no explicit value has been set.
    // An explicit value (set via SpfMedia.preload) always wins.
    const current = state.get();
    if (current.preload !== undefined) return;
    const preload = mediaElement.get()?.preload || undefined;
    update(state, { preload: preload as 'auto' | 'metadata' | 'none' | undefined });
  });
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
  // This is effectively a very simple finite state model. We can formalize this if needed.
  let resolving = false;
  let abortController: AbortController | null = null;

  const cleanup = effect(() => {
    const currentState = state.get();
    if (!canResolve(currentState) || !shouldResolve(currentState) || resolving) return;

    resolving = true;
    abortController = new AbortController();

    const { presentation } = currentState;
    // Fetch and parse playlist
    fetchResolvable(presentation, { signal: abortController.signal })
      .then((response) => getResponseText(response))
      .then((text) => {
        const parsed = parseMultivariantPlaylist(text, presentation);
        update(state, { presentation: parsed });
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

  // Return cleanup function that aborts pending fetches
  return () => {
    abortController?.abort();
    cleanup();
  };
}
