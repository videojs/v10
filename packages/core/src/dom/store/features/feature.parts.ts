import type { AudioFeatures, BackgroundFeatures, VideoFeatures } from '../../media/types';
import { bufferFeature } from './buffer';
import { controlsFeature } from './controls';
import { fullscreenFeature } from './fullscreen';
import { pipFeature } from './pip';
import { playbackFeature } from './playback';
import { sourceFeature } from './source';
import { timeFeature } from './time';
import { volumeFeature } from './volume';

// Short aliases
export {
  bufferFeature as buffer,
  controlsFeature as controls,
  fullscreenFeature as fullscreen,
  pipFeature as pip,
  playbackFeature as playback,
  sourceFeature as source,
  timeFeature as time,
  volumeFeature as volume,
};

export const video: VideoFeatures = [
  playbackFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  fullscreenFeature,
  pipFeature,
  controlsFeature,
];

export const audio: AudioFeatures = [playbackFeature, volumeFeature, timeFeature, sourceFeature, bufferFeature];

// TODO: Add background video features (e.g., playback, source, buffer)
export const background: BackgroundFeatures = [];
