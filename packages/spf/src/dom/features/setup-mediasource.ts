import { isNil } from '@videojs/utils/predicate';
import type { Signal } from 'signal-polyfill';
import { effect } from '../../core/signals/effect';
import type { Presentation } from '../../core/types';
import {
  attachMediaSource,
  createMediaSource,
  observeMediaSourceReadyState,
  waitForSourceOpen,
} from '../media/mediasource-setup';

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
  mediaSourceReadyState?: Signal.ReadonlyState<MediaSource['readyState']>;
}

/**
 * Check if we have the minimum requirements to create MediaSource.
 */
export function canSetup(state: MediaSourceState, owners: MediaSourceOwners): boolean {
  return !isNil(owners.mediaElement) && !isNil(state.presentation?.url);
}

/**
 * Check if we should proceed with MediaSource creation.
 * Placeholder for future conditions (e.g., checking if already created).
 */
export function shouldSetup(_state: MediaSourceState, owners: MediaSourceOwners): boolean {
  // Don't create if we already have one
  return isNil(owners.mediaSource);
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
  state: Signal.State<S>;
  owners: Signal.State<O>;
}): () => void {
  let settingUp = false;
  let abortController: AbortController | null = null;

  const cleanupEffect = effect(() => {
    const currentState = state.get();
    const currentOwners = owners.get();

    if (!canSetup(currentState, currentOwners) || !shouldSetup(currentState, currentOwners) || settingUp) return;

    settingUp = true;
    abortController = new AbortController();
    const { signal } = abortController;
    const mediaElement = currentOwners.mediaElement!;

    const mediaSource = createMediaSource({ preferManaged: true });
    attachMediaSource(mediaSource, mediaElement);

    // Listeners are automatically removed when abortController is aborted.
    const mediaSourceReadyState = observeMediaSourceReadyState(mediaSource, signal);

    waitForSourceOpen(mediaSource, signal)
      .then(() => {
        owners.set(Object.assign({}, owners.get(), { mediaSource, mediaSourceReadyState }) as O);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        throw error;
      })
      .finally(() => {
        settingUp = false;
      });
  });

  return () => {
    abortController?.abort();
    cleanupEffect();
  };
}
