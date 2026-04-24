import { effect } from '../../core/signals/effect';
import { computed, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import {
  attachMediaSource,
  createMediaSource,
  observeMediaSourceReadyState,
} from '../../media/dom/mse/mediasource-setup';
import type { Presentation } from '../../media/types';

/**
 * State shape required for MediaSource setup.
 */
export interface MediaSourceState {
  presentation?: Presentation;
}

/**
 * Owners shape for MediaSource setup.
 */
export interface MediaSourceOwners {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
  /** Reactive mirror of `mediaSource.readyState` — updated via DOM events. */
  mediaSourceReadyState?: ReadonlySignal<MediaSource['readyState']>;
}

/**
 * Setup MediaSource orchestration.
 *
 * Creates and attaches MediaSource when:
 * - mediaElement exists in owners
 * - presentation.url exists in state
 *
 * Updates owners.mediaSource after successful setup.
 */
export function setupMediaSource<S extends MediaSourceState, O extends MediaSourceOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void {
  const abortController = new AbortController();

  // Get the latest mediaElement (even if nullish)
  const mediaElementSignal = computed(() => owners.get().mediaElement);
  // Get the latest presentationUrl (even if nullish)
  const presentationUrlSignal = computed(() => state.get().presentation?.url);

  const canSetupSignal = computed(() => !!mediaElementSignal.get() && !!presentationUrlSignal.get());

  const mediaElementSrcSignal = computed(() => mediaElementSignal.get()?.src);
  const mediaSourceSignal = computed(() => owners.get().mediaSource);
  const shouldSetupSignal = computed(() => !mediaElementSrcSignal.get());

  // NOTE: This should be cleaner and less brittle if/when Reactors have their own internal finite state. This is planned as followup work.
  // (here, e.g. something like: "preconditions_unmet"|"pending"|"setting_up"|"tearing_down"|"set_up")
  // This should also avoid needing nested effect().
  const cleanupEffect = effect(() => {
    if (!canSetupSignal.get() || !shouldSetupSignal.get()) return;
    const mediaElement = mediaElementSignal.get() as HTMLMediaElement;
    const { signal } = abortController;

    const mediaSource = createMediaSource({ preferManaged: true });
    // NOTE: Consider making MediaSource an Actor and using this in it.
    const mediaSourceReadyState = observeMediaSourceReadyState(mediaSource, signal);
    attachMediaSource(mediaSource, mediaElement);

    const cleanupOwnersUpdateEffect = effect(() => {
      // If we already have a MediaSource or the *internal* mediaSource is not yet fully attached, wait to add it to owners;
      if (!!mediaSourceSignal.get() || mediaSourceReadyState.get() !== 'open') return;
      owners.set(Object.assign({}, owners.get(), { mediaSource, mediaSourceReadyState }) as O);
    });

    return () => {
      cleanupOwnersUpdateEffect();
    };
  });

  return () => {
    abortController?.abort();
    cleanupEffect();
  };
}
