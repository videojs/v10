import { combineLatest } from '../reactive/combine-latest';
import type { WritableState } from '../state/create-state';
import type { AudioTrack, Presentation, VideoTrack } from '../types';
import { isResolvedTrack } from '../types';
import { getSelectedTrack } from '../utils/track-selection';

export interface PresentationDurationState {
  presentation?: Presentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

/**
 * Check if we can calculate presentation duration (have required data).
 */
export function canCalculateDuration(state: PresentationDurationState): boolean {
  if (!state.presentation) return false;
  // Need at least one selected track
  return !!(state.selectedVideoTrackId || state.selectedAudioTrackId);
}

/**
 * Check if we should calculate presentation duration (conditions met).
 */
export function shouldCalculateDuration(state: PresentationDurationState): boolean {
  if (!canCalculateDuration(state)) return false;

  const { presentation } = state;

  // Don't recalculate if already set
  if (presentation!.duration !== undefined) return false;

  // Check if any selected track is resolved
  const videoTrack = state.selectedVideoTrackId ? getSelectedTrack(state, 'video') : undefined;
  const audioTrack = state.selectedAudioTrackId ? getSelectedTrack(state, 'audio') : undefined;

  // At least one track must be resolved (has segments and duration)
  return !!((videoTrack && isResolvedTrack(videoTrack)) || (audioTrack && isResolvedTrack(audioTrack)));
}

/**
 * Get duration from the first resolved track (prefer video, fallback to audio).
 */
export function getDurationFromResolvedTracks(state: PresentationDurationState): number | undefined {
  // Try video track first
  const videoTrack = state.selectedVideoTrackId
    ? (getSelectedTrack(state, 'video') as VideoTrack | undefined)
    : undefined;
  if (videoTrack && isResolvedTrack(videoTrack)) {
    return videoTrack.duration;
  }

  // Fallback to audio track
  const audioTrack = state.selectedAudioTrackId
    ? (getSelectedTrack(state, 'audio') as AudioTrack | undefined)
    : undefined;
  if (audioTrack && isResolvedTrack(audioTrack)) {
    return audioTrack.duration;
  }

  return undefined;
}

/**
 * Calculate presentation duration task (module-level, pure).
 * Extracts duration from resolved tracks and patches presentation.
 */
const calculatePresentationDurationTask = async (
  { currentState }: { currentState: PresentationDurationState },
  context: { state: WritableState<PresentationDurationState> }
): Promise<void> => {
  const duration = getDurationFromResolvedTracks(currentState);
  if (duration === undefined || !Number.isFinite(duration)) return;

  const { presentation } = currentState;

  // Patch presentation with duration
  context.state.patch({
    presentation: {
      ...presentation!,
      duration,
    },
  });
};

/**
 * Calculate and set presentation duration from resolved tracks.
 */
export function calculatePresentationDuration({
  state,
}: {
  state: WritableState<PresentationDurationState>;
}): () => void {
  return combineLatest([state]).subscribe(async ([currentState]: [PresentationDurationState]) => {
    if (!shouldCalculateDuration(currentState)) return;

    // Execute task (no tracking needed - guards prevent duplicate work)
    await calculatePresentationDurationTask({ currentState }, { state });
  });
}
