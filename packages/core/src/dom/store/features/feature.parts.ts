import { bufferFeature } from './buffer';
import { fullscreenFeature } from './fullscreen';
import { pipFeature } from './pip';
import { playbackFeature } from './playback';
import { sourceFeature } from './source';
import { timeFeature } from './time';
import { volumeFeature } from './volume';

// Short aliases
export {
  bufferFeature as buffer,
  fullscreenFeature as fullscreen,
  pipFeature as pip,
  playbackFeature as playback,
  sourceFeature as source,
  timeFeature as time,
  volumeFeature as volume,
};

export const video = [
  playbackFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  fullscreenFeature,
  pipFeature,
] as const;

export const audio = [playbackFeature, volumeFeature, timeFeature, sourceFeature, bufferFeature] as const;
