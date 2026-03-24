import type { AudioFeatures, BackgroundFeatures, VideoFeatures } from '../../media/types';
import { bufferFeature } from './buffer';
import { controlsFeature } from './controls';
import { errorFeature } from './error';
import { fullscreenFeature } from './fullscreen';
import { pipFeature } from './pip';
import { playbackFeature } from './playback';
import { playbackRateFeature } from './playback-rate';
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
