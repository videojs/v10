import { defineBehavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import {
  attachMediaSource,
  createMediaSource,
  onMediaSourceReadyStateChange,
} from '../../../media/dom/mse/mediasource-setup';
import type { MaybeResolvedPresentation } from '../../../media/types';

/**
 * State shape required for MediaSource setup.
 */
export interface MediaSourceState {
  presentation?: MaybeResolvedPresentation;
  /** Reactive mirror of `mediaSource.readyState` — updated via DOM events. */
  mediaSourceReadyState?: MediaSource['readyState'];
}

/**
 * Context shape for MediaSource setup.
 */
export interface MediaSourceContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
}

/**
 * Setup MediaSource orchestration.
 *
 * Creates and attaches MediaSource when:
 * - mediaElement exists in context
 * - presentation.url exists in state
 *
 * Updates context.mediaSource after successful setup.
 */
function setupMediaSourceSetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<MediaSourceState['presentation']>;
    mediaSourceReadyState: Signal<MediaSourceState['mediaSourceReadyState']>;
  };
  context: {
    mediaElement: ReadonlySignal<MediaSourceContext['mediaElement']>;
    mediaSource: Signal<MediaSourceContext['mediaSource']>;
  };
}): () => void {
  const abortController = new AbortController();

  // Get the latest mediaElement (even if nullish)
  const mediaElementSignal = computed(() => context.mediaElement.get());
  // Get the latest presentationUrl (even if nullish)
  const presentationUrlSignal = computed(() => state.presentation.get()?.url);

  const canSetupSignal = computed(() => !!mediaElementSignal.get() && !!presentationUrlSignal.get());

  const mediaElementSrcSignal = computed(() => mediaElementSignal.get()?.src);
  const mediaSourceSignal = computed(() => context.mediaSource.get());
  const shouldSetupSignal = computed(() => !mediaElementSrcSignal.get());

  // NOTE: This should be cleaner and less brittle if/when Reactors have their own internal finite state. This is planned as followup work.
  // (here, e.g. something like: "preconditions_unmet"|"pending"|"setting_up"|"tearing_down"|"set_up")
  // This should also avoid needing nested effect().
  const cleanupEffect = effect(() => {
    if (!canSetupSignal.get() || !shouldSetupSignal.get()) return;
    const mediaElement = mediaElementSignal.get() as HTMLMediaElement;
    const { signal: abortSignal } = abortController;

    const mediaSource = createMediaSource({ preferManaged: true });
    // NOTE: Consider making MediaSource an Actor and using this in it.
    state.mediaSourceReadyState.set(mediaSource.readyState);
    onMediaSourceReadyStateChange(mediaSource, abortSignal, (readyState) => {
      state.mediaSourceReadyState.set(readyState);
    });
    attachMediaSource(mediaSource, mediaElement);

    const cleanupContextUpdateEffect = effect(() => {
      // If we already have a MediaSource or the *internal* mediaSource is not yet fully attached, wait to add it to context;
      if (!!mediaSourceSignal.get() || state.mediaSourceReadyState.get() !== 'open') return;
      context.mediaSource.set(mediaSource);
    });

    return () => {
      cleanupContextUpdateEffect();
    };
  });

  return () => {
    abortController?.abort();
    cleanupEffect();
  };
}

export const setupMediaSource = defineBehavior({
  stateKeys: ['presentation', 'mediaSourceReadyState'],
  contextKeys: ['mediaElement', 'mediaSource'],
  setup: setupMediaSourceSetup,
});
