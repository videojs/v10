import type {
  AudioTrack,
  MaybeResolvedPresentation,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedTextTrack,
  PartiallyResolvedVideoTrack,
  TextTrack,
  TrackType,
  VideoTrack,
} from '../types';
import { isResolvedTrack } from '../types';

/**
 * State shape for track selection.
 * Minimal shape containing presentation and selected track IDs.
 */
export interface TrackSelectionState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string | undefined;
  selectedAudioTrackId?: string | undefined;
  selectedTextTrackId?: string | undefined;
}

/**
 * Map track type to selected track ID property key in state.
 */
export const SelectedTrackIdKeyByType = {
  video: 'selectedVideoTrackId',
  audio: 'selectedAudioTrackId',
  text: 'selectedTextTrackId',
} as const;

/**
 * Get selected track from state by type.
 * Returns properly typed track (partially or fully resolved) or undefined.
 * Type parameter T is inferred from the type argument.
 *
 * @example
 * const videoTrack = getSelectedTrack(state, 'video');
 * if (videoTrack && isResolvedTrack(videoTrack)) {
 *   // videoTrack is VideoTrack
 * }
 */
export function getSelectedTrack<T extends TrackType>(
  state: TrackSelectionState,
  type: T
): T extends 'video'
  ? PartiallyResolvedVideoTrack | VideoTrack | undefined
  : T extends 'audio'
    ? PartiallyResolvedAudioTrack | AudioTrack | undefined
    : T extends 'text'
      ? PartiallyResolvedTextTrack | TextTrack | undefined
      : never {
  const { presentation } = state;

  if (!presentation?.selectionSets) return undefined as any;

  // Get track ID based on type
  const trackIdKey = SelectedTrackIdKeyByType[type];
  const trackId = state[trackIdKey];
  return presentation.selectionSets
    .find(({ type: selectionSetType }) => selectionSetType === type)
    ?.switchingSets[0]?.tracks.find(({ id }) => id === trackId) as any;
}

/**
 * Returns the duration of the first resolved selected track, preferring
 * video over audio. A track is "resolved" once its media playlist has been
 * parsed (per {@link isResolvedTrack}). Returns `undefined` if neither
 * selected track is resolved.
 */
export function getResolvedSelectedTrackDuration(state: TrackSelectionState): number | undefined {
  if (state.selectedVideoTrackId) {
    const video = getSelectedTrack(state, 'video');
    if (video && isResolvedTrack(video)) return video.duration;
  }
  if (state.selectedAudioTrackId) {
    const audio = getSelectedTrack(state, 'audio');
    if (audio && isResolvedTrack(audio)) return audio.duration;
  }
  return undefined;
}
