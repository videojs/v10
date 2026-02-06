import { fetchResolvable, getResponseText } from '../../dom/network/fetch';
import type { EventStream } from '../events/create-event-stream';
import { parseMultivariantPlaylist } from '../hls/parse-multivariant';
import { combineLatest } from '../reactive/combine-latest';
import type { WritableState } from '../state/create-state';
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
 * Determines if resolution conditions are met based on preload policy and event.
 *
 * Checks resolution conditions independently from presentation state.
 * Use with isUnresolved() to determine if fetch should be triggered.
 *
 * Resolution conditions:
 * - State-driven: preload is 'auto' or 'metadata'
 * - Event-driven: PLAY event when preload is 'none'
 *
 * @param state - Current presentation state
 * @param event - Current action/event
 * @returns true if resolution conditions are met
 */
export function shouldResolve(state: PresentationState, event: PresentationAction): boolean {
  const { preload } = state;
  return (
    // State-driven: preload allows (auto/metadata)
    ['auto', 'metadata'].includes(preload as any) ||
    // Event-driven: play event when preload="none"
    event.type === 'play'
  );
}

/**
 * Syncs preload attribute from mediaElement to state.
 *
 * Watches the owners state for mediaElement changes and copies the
 * preload attribute to the immutable state.
 *
 * @param state - Immutable state container
 * @param owners - Mutable platform objects container
 * @returns Cleanup function to stop syncing
 */
export function syncPreloadAttribute(
  state: WritableState<PresentationState>,
  owners: WritableState<PlatformOwners>
): () => void {
  return owners.subscribe((current) => {
    const preload = current.mediaElement?.preload || undefined;
    state.patch({ preload: preload as 'auto' | 'metadata' | 'none' | undefined });
  });
}

/**
 * Action types for presentation resolution.
 * Event names match HTMLMediaElement events (lowercase).
 */
export type PresentationAction = { type: 'play' } | { type: 'pause' } | { type: 'load'; url: string };

/**
 * Resolves unresolved presentations using reactive composition.
 *
 * Uses combineLatest to compose state + events, enabling both state-driven
 * and event-driven resolution triggers.
 *
 * Triggers resolution when:
 * - State-driven: Unresolved presentation + preload allows (auto/metadata)
 * - Event-driven: PLAY event when preload="none"
 *
 * @param state - State container with presentation and preload
 * @param events - Event stream for actions
 * @returns Cleanup function
 *
 * @example
 * ```ts
 * const state = createState({ presentation: undefined, preload: 'auto' });
 * const events = createEventStream<PresentationAction>();
 *
 * const cleanup = resolvePresentation(state, events);
 *
 * // State-driven: resolves immediately when preload allows
 * state.patch({ presentation: { url: 'http://example.com/playlist.m3u8' } });
 *
 * // Event-driven: resolves on PLAY when preload="none"
 * state.patch({ preload: 'none', presentation: { url: '...' } });
 * events.dispatch({ type: 'PLAY' });
 * ```
 */
export function resolvePresentation(
  state: WritableState<PresentationState>,
  events: EventStream<PresentationAction>
): () => void {
  // This is effectively a very simple finite state model. We can formalize this if needed.
  let resolving = false;

  return combineLatest([state, events]).subscribe(async ([currentState, event]) => {
    if (!canResolve(currentState) || !shouldResolve(currentState, event) || resolving) return;

    try {
      // This along with the resolving finite state (or more complex) could be pulled into its own abstraction.
      // Set flag before async work
      resolving = true;
      const { presentation } = currentState;
      // Fetch and parse playlist
      const response = await fetchResolvable(presentation);
      const text = await getResponseText(response);
      const parsed = parseMultivariantPlaylist(text, presentation.url);

      // Update state with resolved presentation
      state.patch({
        presentation: parsed,
      });
    } finally {
      // Always clear flag
      resolving = false;
    }
  });
}
