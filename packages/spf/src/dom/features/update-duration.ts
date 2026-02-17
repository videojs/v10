import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { Presentation } from '../../core/types';
import { hasPresentationDuration } from '../../core/types';

export interface DurationUpdateState {
  presentation?: Presentation;
}

export interface DurationUpdateOwners {
  mediaSource?: MediaSource;
  videoSourceBuffer?: SourceBuffer;
  audioSourceBuffer?: SourceBuffer;
}

/**
 * Check if we can update MediaSource duration (have required data).
 */
export function canUpdateDuration(state: DurationUpdateState, owners: DurationUpdateOwners): boolean {
  return !!(owners.mediaSource && state.presentation && hasPresentationDuration(state.presentation));
}

/**
 * Get the maximum buffered end time across all SourceBuffers.
 */
export function getMaxBufferedEnd(owners: DurationUpdateOwners): number {
  let maxEnd = 0;

  const buffers = [owners.videoSourceBuffer, owners.audioSourceBuffer].filter(
    (buf): buf is SourceBuffer => buf !== undefined
  );

  for (const buffer of buffers) {
    const { buffered } = buffer;
    if (buffered.length > 0) {
      const end = buffered.end(buffered.length - 1);
      if (end > maxEnd) {
        maxEnd = end;
      }
    }
  }

  return maxEnd;
}

/**
 * Check if we should update MediaSource duration (conditions met).
 */
export function shouldUpdateDuration(state: DurationUpdateState, owners: DurationUpdateOwners): boolean {
  if (!canUpdateDuration(state, owners)) return false;

  const { mediaSource } = owners;
  const { presentation } = state;

  // MediaSource must be open
  if (mediaSource!.readyState !== 'open') return false;

  const duration = presentation!.duration!;

  // Validate duration: finite, positive, not NaN
  if (!Number.isFinite(duration) || Number.isNaN(duration) || duration <= 0) return false;

  // Only update if different (avoid unnecessary sets)
  return mediaSource!.duration !== duration;
}

/**
 * Duration update task (module-level, pure).
 * Sets MediaSource duration, extending if buffered ranges exceed calculated value.
 */
const updateDurationTask = async (
  { currentState, currentOwners }: { currentState: DurationUpdateState; currentOwners: DurationUpdateOwners },
  _context: {}
): Promise<void> => {
  const { mediaSource } = currentOwners;
  let duration = currentState.presentation!.duration!;

  // Get max buffered end time across all SourceBuffers
  const maxBufferedEnd = getMaxBufferedEnd(currentOwners);

  // MSE spec: duration cannot be less than any buffered range
  // If buffered ranges exceed calculated duration, extend to match
  if (maxBufferedEnd > duration) {
    duration = maxBufferedEnd;
  }

  // Set duration on MediaSource
  mediaSource!.duration = duration;
};

/**
 * Update MediaSource duration when presentation duration becomes available.
 */
export function updateDuration({
  state,
  owners,
}: {
  state: WritableState<DurationUpdateState>;
  owners: WritableState<DurationUpdateOwners>;
}): () => void {
  return combineLatest([state, owners]).subscribe(
    async ([currentState, currentOwners]: [DurationUpdateState, DurationUpdateOwners]) => {
      if (!shouldUpdateDuration(currentState, currentOwners)) return;

      // Execute task (no tracking needed - guards prevent duplicate work)
      await updateDurationTask({ currentState, currentOwners }, {});
    }
  );
}
