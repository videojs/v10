import { isNil } from '@videojs/utils/predicate';
import { attachMediaSource, createMediaSource, waitForSourceOpen } from '../../dom/media/mediasource-setup';
import { combineLatest } from '../reactive/combine-latest';
import type { WritableState } from '../state/create-state';
import type { Presentation } from '../types';

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
  mediaElement?: HTMLMediaElement;
  mediaSource?: MediaSource;
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
export function setupMediaSource({
  state,
  owners,
}: {
  state: WritableState<MediaSourceState>;
  owners: WritableState<MediaSourceOwners>;
}): () => void {
  let settingUp = false;

  return combineLatest([state, owners]).subscribe(
    async ([currentState, currentOwners]: [MediaSourceState, MediaSourceOwners]) => {
      if (!canSetup(currentState, currentOwners) || !shouldSetup(currentState, currentOwners) || settingUp) return;

      try {
        settingUp = true;

        // Create MediaSource
        const mediaSource = createMediaSource({ preferManaged: true });

        // Attach to element
        attachMediaSource(mediaSource, currentOwners.mediaElement!);

        // Wait for sourceopen
        await waitForSourceOpen(mediaSource);

        // Update owners with created MediaSource
        owners.patch({ mediaSource });
      } finally {
        settingUp = false;
      }
    }
  );
}
