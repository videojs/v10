import { effect } from '../../core/signals/effect';
import { computed, type Signal, update } from '../../core/signals/primitives';
import type { MediaElementLike } from '../../media/types';
import type { PresentationState } from './resolve-presentation';

/**
 * Owners shape for preload attribute sync.
 */
export interface PlatformOwners {
  mediaElement?: MediaElementLike | undefined;
}

/**
 * Syncs preload attribute from mediaElement to state.
 *
 * Watches the owners signal for mediaElement changes and copies the
 * preload attribute to state when no explicit value has been set.
 * An explicit value (set via SimpleHlsMediaElement.preload) always wins.
 *
 * @example
 * const cleanup = syncPreloadAttribute({ state, owners });
 */
export function syncPreloadAttribute<S extends PresentationState, O extends PlatformOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void {
  const mediaElement = computed(() => owners.get().mediaElement);
  return effect(() => {
    if (state.get().preload !== undefined) return;
    const preload = mediaElement.get()?.preload || undefined;
    if (preload === undefined) return;
    const patch: Partial<PresentationState> = { preload: preload as 'auto' | 'metadata' | 'none' };
    update(state, patch);
  });
}
