import type {
  AudioFeatures,
  BackgroundFeatures,
  LiveAudioFeatures,
  LiveVideoFeatures,
  VideoFeatures,
} from '../../media/types';
import { bufferFeature } from './buffer';
import { controlsFeature } from './controls';
import { errorFeature } from './error';
import { fullscreenFeature } from './fullscreen';
import { pipFeature } from './pip';
import { playbackFeature } from './playback';
import { playbackRateFeature } from './playback-rate';
import { remotePlaybackFeature } from './remote-playback';
import { sourceFeature } from './source';
import { textTrackFeature } from './text-track';
import { timeFeature } from './time';
import { volumeFeature } from './volume';

export const videoFeatures: VideoFeatures = [
  playbackFeature,
  playbackRateFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  fullscreenFeature,
  pipFeature,
  remotePlaybackFeature,
  controlsFeature,
  textTrackFeature,
  errorFeature,
];

export const audioFeatures: AudioFeatures = [
  playbackFeature,
  playbackRateFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  errorFeature,
];

// TODO: Add background video features (e.g., playback, source, buffer)
export const backgroundFeatures: BackgroundFeatures = [];

/**
 * Features for a live video player. Mirrors {@link videoFeatures} without the
 * playback-rate feature, which isn't meaningful for live streams.
 */
export const liveVideoFeatures: LiveVideoFeatures = [
  playbackFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  fullscreenFeature,
  pipFeature,
  remotePlaybackFeature,
  controlsFeature,
  textTrackFeature,
  errorFeature,
];

/**
 * Features for a live audio player. Mirrors {@link audioFeatures} without the
 * playback-rate feature, which isn't meaningful for live streams.
 */
export const liveAudioFeatures: LiveAudioFeatures = [
  playbackFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  errorFeature,
];
