import type { MediaTextCue, MediaTextTrack, MediaTextTrackState } from '@videojs/media';
import { createSelector, type Selector } from '@videojs/store';

import { audioTrackFeature } from './features/audio-track';
import { bufferFeature } from './features/buffer';
import { controlsFeature } from './features/controls';
import { errorFeature } from './features/error';
import { fullscreenFeature } from './features/fullscreen';
import { liveFeature } from './features/live';
import { metadataFeature } from './features/metadata';
import { pipFeature } from './features/pip';
import { playbackFeature } from './features/playback';
import { playbackRateFeature } from './features/playback-rate';
import { qualityFeature } from './features/quality';
import { remotePlaybackFeature } from './features/remote-playback';
import { sourceFeature } from './features/source';
import { streamTypeFeature } from './features/stream-type';
import { textTrackFeature } from './features/text-track';
import { timeFeature } from './features/time';
import { volumeFeature } from './features/volume';

/** Select the audio track state (audioTrackList, selectAudioTrack). */
export const selectAudioTrack = createSelector(audioTrackFeature);
/** Select the buffer state (buffered ranges, percent buffered). */
export const selectBuffer = createSelector(bufferFeature);
/** Select the controls state (controls visible, user-active). */
export const selectControls = createSelector(controlsFeature);
/** Select the error state (error, dismissed, dismissError). */
export const selectError = createSelector(errorFeature);
/** Select the fullscreen state (fullscreen active, availability). */
export const selectFullscreen = createSelector(fullscreenFeature);
/** Select the live state (`liveEdgeStart`, `targetLiveWindow`). */
export const selectLive = createSelector(liveFeature);
/** Select resolved content metadata and its user-config writers. */
export const selectMetadata = createSelector(metadataFeature);
/** Select the PiP state (picture-in-picture active, availability). */
export const selectPiP = createSelector(pipFeature);
/** Select the playback state (paused, ended, play, pause, toggle). */
export const selectPlayback = createSelector(playbackFeature);
/** Select the playback rate state (playbackRate, playbackRates, setPlaybackRate). */
export const selectPlaybackRate = createSelector(playbackRateFeature);
/** Select the quality state (videoRenditionList, activeVideoRendition, selectVideoRendition). */
export const selectQuality = createSelector(qualityFeature);
/** Select the remote playback state (remote playback connection state, availability). */
export const selectRemotePlayback = createSelector(remotePlaybackFeature);
/** Select the source state (src, type). */
export const selectSource = createSelector(sourceFeature);
/** Select the stream type state (`'on-demand' | 'live' | 'unknown'`). */
export const selectStreamType = createSelector(streamTypeFeature);
/** Select the text track state (chapters cues, thumbnail cues). */
export const selectTextTrack = createSelector(textTrackFeature);

/** A selected text track with the cue and source data needed by its consumer. */
export interface MediaTextTrackDetails<Kind extends string = TextTrackKind> extends MediaTextTrack<Kind> {
  cues: MediaTextCue[];
  src: string | null;
}

/**
 * Find a text track matching a kind and optional label.
 *
 * Chapters are limited to the first chapters track because that is the track
 * represented by `chaptersCues`. Thumbnail metadata tracks expose their cues
 * and source so relative storyboard URLs can be resolved.
 *
 * @public
 * @param state - Text track feature state, or `undefined` when the feature is not configured.
 * @param kind - Text track kind to match.
 * @param label - Optional label to distinguish tracks with the same kind.
 */
export function getTextTrack<Kind extends string>(
  state: MediaTextTrackState | undefined,
  kind: Kind,
  label?: string
): MediaTextTrackDetails<Kind> | undefined {
  if (!state) return undefined;

  const tracks = state.textTrackList.filter((track) => track.kind === kind);
  const candidates = kind === 'chapters' ? tracks.slice(0, 1) : tracks;
  const track = candidates.find((track) => label === undefined || track.label === label);
  if (!track) return undefined;

  let cues: MediaTextCue[] = [];
  let src: string | null = null;

  switch (track.kind) {
    case 'chapters':
      cues = state.chaptersCues;
      break;
    case 'metadata':
      if (track.label === 'thumbnails') {
        cues = state.thumbnailCues;
        src = state.thumbnailTrackSrc;
      }
      break;
  }

  return {
    ...track,
    kind,
    cues,
    src,
  };
}

/**
 * Create a player-state selector for the first text track matching a kind and
 * optional label.
 *
 * @param kind - Text track kind to match.
 * @param label - Optional label to distinguish tracks with the same kind.
 */
export function createTextTrackSelector<Kind extends string>(
  kind: Kind,
  label?: string
): Selector<object, MediaTextTrackDetails<Kind> | undefined> {
  return Object.assign((state: object) => getTextTrack(selectTextTrack(state), kind, label), {
    displayName: `textTrack:${kind}${label === undefined ? '' : `:${label}`}`,
  });
}
/** Select the time state (currentTime, duration, seek). */
export const selectTime = createSelector(timeFeature);
/** Select the volume state (volume, muted, setVolume, setMuted). */
export const selectVolume = createSelector(volumeFeature);
