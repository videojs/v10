import type {
  AudioSelectionSet,
  AudioTrack,
  FrameRate,
  MaybeResolvedPresentation,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedTextTrack,
  PartiallyResolvedVideoTrack,
  TextTrack,
  TrackType,
  VideoSelectionSet,
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

/**
 * A selectable video rendition (quality level) from the presentation. Each
 * video track in the selected video switching set is one rendition, carried in
 * the model's own vocabulary (`bandwidth`, `codecs`, `FrameRate`); DOM
 * consumers map these onto their platform shapes.
 */
export interface VideoRenditionInfo {
  id: string;
  url: string;
  width?: number;
  height?: number;
  codecs?: string[];
  bandwidth: number;
  frameRate?: FrameRate;
}

/**
 * Read the selectable video renditions from a presentation — the tracks of the
 * first video switching set. Returns an empty array when the presentation is
 * unresolved or carries no video.
 *
 * @param presentation - The engine's current (maybe-resolved) presentation.
 */
export function getVideoRenditions(state: TrackSelectionState): VideoRenditionInfo[] {
  const { presentation } = state;
  const videoSet = presentation?.selectionSets?.find((set): set is VideoSelectionSet => set.type === 'video');

  return (videoSet?.switchingSets[0]?.tracks ?? []).map((track) => ({
    id: track.id,
    url: track.url,
    width: track.width,
    height: track.height,
    codecs: track.codecs,
    bandwidth: track.bandwidth,
    frameRate: track.frameRate,
  }));
}

/**
 * A selectable audio track — one per distinct language, collapsing the model's
 * per-(language × quality-group) tracks. `trackIds` lists the underlying track
 * ids so consumers can map a resolved `selectedAudioTrackId` back to its group.
 */
export interface AudioTrackInfo {
  id: string;
  language?: string;
  name: string;
  default?: boolean;
  trackIds: string[];
}

/**
 * Read the selectable audio tracks from a presentation — the tracks of the first
 * audio switching set, collapsed to one entry per (language, name) in manifest
 * order. Returns an empty array when the presentation is unresolved or carries
 * no audio.
 */
export function getAudioTracks(state: TrackSelectionState): AudioTrackInfo[] {
  const { presentation } = state;
  const audioSet = presentation?.selectionSets?.find((set): set is AudioSelectionSet => set.type === 'audio');

  const byLanguage = new Map<string, AudioTrackInfo>();
  for (const track of audioSet?.switchingSets[0]?.tracks ?? []) {
    const key = `${track.language ?? ''}.${track.name}`;
    const existing = byLanguage.get(key);
    if (existing) {
      existing.trackIds.push(track.id);
      if (track.default) existing.default = true;
    } else {
      byLanguage.set(key, {
        id: track.id,
        language: track.language,
        name: track.name,
        default: track.default,
        trackIds: [track.id],
      });
    }
  }
  return [...byLanguage.values()];
}
