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
 * Resolution conditions:
 * - State-driven: preload is 'auto' or 'metadata'
 * - Event-driven: play event
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
    // Event-driven: play event
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
  let lastMediaElement: MediaElementLike | undefined;

  return owners.subscribe((current) => {
    const { mediaElement } = current;

    if (mediaElement === lastMediaElement) return;
    lastMediaElement = mediaElement;

    const raw = mediaElement?.preload;
    // Per spec, absent preload attribute returns '' — treat as 'auto' (browser default)
    const preload = raw === '' ? 'auto' : raw || undefined;
    state.patch({ preload: preload as 'auto' | 'metadata' | 'none' | undefined });
  });
}

/**
 * Action types for presentation resolution.
 * Event names match HTMLMediaElement events (lowercase).
 */
export type PresentationAction = { type: 'play' } | { type: 'pause' } | { type: 'load'; url: string };

/**
 * Presentation resolution task (module-level, pure).
 * Fetches and parses multivariant playlist.
 */
const resolvePresentationTask = async (
  { currentState }: { currentState: PresentationState },
  context: { signal: AbortSignal; state: WritableState<PresentationState> }
): Promise<void> => {
  const { presentation } = currentState;

  // Fetch and parse playlist
  const response = await fetchResolvable(presentation!, { signal: context.signal });
  const text = await getResponseText(response);
  const parsed = parseMultivariantPlaylist(text, presentation!);

  // Update state with resolved presentation
  context.state.patch({ presentation: parsed });
};

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
 * @example
 * ```ts
 * const state = createState({ presentation: undefined, preload: 'auto' });
 * const events = createEventStream<PresentationAction>();
 *
 * const cleanup = resolvePresentation({ state, events });
 *
 * // State-driven: resolves immediately when preload allows
 * state.patch({ presentation: { url: 'http://example.com/playlist.m3u8' } });
 *
 * // Event-driven: resolves on PLAY when preload="none"
 * state.patch({ preload: 'none', presentation: { url: '...' } });
 * events.dispatch({ type: 'PLAY' });
 * ```
 */
export function resolvePresentation({
  state,
  events,
}: {
  state: WritableState<PresentationState>;
  events: EventStream<PresentationAction>;
}): () => void {
  let currentTask: Promise<void> | null = null;
  let abortController: AbortController | null = null;

  const cleanup = combineLatest([state, events]).subscribe(async ([currentState, event]) => {
    if (!canResolve(currentState) || !shouldResolve(currentState, event)) return;
    if (currentTask) return; // Task already in progress

    // Create abort controller and invoke task
    abortController = new AbortController();
    currentTask = resolvePresentationTask({ currentState }, { signal: abortController.signal, state });

    try {
      await currentTask;
    } catch (error) {
      // Ignore AbortError - expected when cleanup happens
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      throw error;
    } finally {
      // Cleanup orchestration state
      currentTask = null;
      abortController = null;
    }
  });

  // Return cleanup function that aborts pending task
  return () => {
    abortController?.abort();
    cleanup();
  };
}
