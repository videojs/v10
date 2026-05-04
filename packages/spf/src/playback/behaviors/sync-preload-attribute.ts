import { type ContextSignals, defineBehavior, type StateSignals } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import { computed } from '../../core/signals/primitives';
import type { MediaElementLike } from '../../media/types';
import type { PresentationState } from './resolve-presentation';

/**
 * Context shape for preload attribute sync.
 */
export interface PlatformContext {
  mediaElement?: MediaElementLike | undefined;
}

/**
 * State slice this behavior reads/writes — narrowed from the broader
 * `PresentationState` to only the keys touched by the body. The
 * `defineBehavior` exhaustiveness check requires `stateKeys` to list
 * every key in this typed slice.
 */
type State = Pick<PresentationState, 'preload'>;

/**
 * Syncs preload attribute from mediaElement to state.
 *
 * Watches the context signal for mediaElement changes and copies the
 * preload attribute to state when no explicit value has been set.
 * An explicit value (set via SimpleHlsMediaElement.preload) always wins.
 *
 * @example
 * const cleanup = syncPreloadAttribute.setup({ state, context, config: {} });
 */
function syncPreloadAttributeSetup({
  state,
  context,
}: {
  state: StateSignals<State>;
  context: ContextSignals<PlatformContext>;
}): () => void {
  const mediaElement = computed(() => context.mediaElement.get());
  return effect(() => {
    if (state.preload.get() !== undefined) return;
    const preload = mediaElement.get()?.preload || undefined;
    if (preload === undefined) return;
    state.preload.set(preload as 'auto' | 'metadata' | 'none');
  });
}

export const syncPreloadAttribute = defineBehavior({
  stateKeys: ['preload'],
  contextKeys: ['mediaElement'],
  setup: syncPreloadAttributeSetup,
});
