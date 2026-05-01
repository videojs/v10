import type { ContextSignals, StateSignals } from '../../core/composition/create-composition';
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
 * Syncs preload attribute from mediaElement to state.
 *
 * Watches the context signal for mediaElement changes and copies the
 * preload attribute to state when no explicit value has been set.
 * An explicit value (set via SimpleHlsMediaElement.preload) always wins.
 *
 * @example
 * const cleanup = syncPreloadAttribute({ state, context });
 */
export function syncPreloadAttribute({
  state,
  context,
}: {
  state: StateSignals<PresentationState>;
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
