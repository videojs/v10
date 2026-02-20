import { isNil } from '@videojs/utils/predicate';
import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation } from '../../core/types';
import { attachMediaSource, createMediaSource, waitForSourceOpen } from '../media/mediasource-setup';

/**
 * Setup MediaSource task (module-level, pure).
 * Creates MediaSource, attaches to element, waits for sourceopen.
 */
const setupMediaSourceTask = async (
  { currentOwners }: { currentOwners: MediaSourceOwners },
  context: { signal: AbortSignal; owners: WritableState<MediaSourceOwners> }
): Promise<void> => {
  // Create MediaSource
  const mediaSource = createMediaSource({ preferManaged: true });

  // Attach to element
  attachMediaSource(mediaSource, currentOwners.mediaElement!);

  // Wait for sourceopen (abortable)
  await waitForSourceOpen(mediaSource, context.signal);

  // Update owners with created MediaSource
  context.owners.patch({ mediaSource });
};

/**
 * State shape required for MediaSource setup.
 */
export interface MediaSourceState {
  presentation?: Presentation;
  preload?: string;
  playbackInitiated?: boolean;
}

/**
 * Owners shape for MediaSource setup.
 */
export interface MediaSourceOwners {
  mediaElement?: HTMLMediaElement;
  mediaSource?: MediaSource;
}

/**
 * Check if we have the minimum requirements to create MediaSource.
 *
 * Requires mediaElement, a resolved presentation, and either eager preload
 * or explicit playback initiation — prevents attaching a MediaSource (which
 * triggers a browser loading spinner) before the user presses play when
 * preload="none".
 */
export function canSetup(state: MediaSourceState, owners: MediaSourceOwners): boolean {
  return (
    !isNil(owners.mediaElement) &&
    !isNil(state.presentation?.url) &&
    (state.preload !== 'none' || !!state.playbackInitiated)
  );
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
export function setupMediaSource({
  state,
  owners,
}: {
  state: WritableState<MediaSourceState>;
  owners: WritableState<MediaSourceOwners>;
}): () => void {
  let currentTask: Promise<void> | null = null;
  let abortController: AbortController | null = null;

  const cleanup = combineLatest([state, owners]).subscribe(
    async ([currentState, currentOwners]: [MediaSourceState, MediaSourceOwners]) => {
      if (!canSetup(currentState, currentOwners) || !shouldSetup(currentState, currentOwners)) return;
      if (currentTask) return; // Task already in progress

      // Create abort controller and invoke task
      abortController = new AbortController();
      currentTask = setupMediaSourceTask({ currentOwners }, { signal: abortController.signal, owners });

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
    }
  );

  // Return cleanup function that aborts pending task
  return () => {
    abortController?.abort();
    cleanup();
  };
}
