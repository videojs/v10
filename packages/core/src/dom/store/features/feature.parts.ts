import { bufferFeature } from './buffer';
import { playbackFeature } from './playback';
import { presentationFeature } from './presentation';
import { sourceFeature } from './source';
import { timeFeature } from './time';
import { volumeFeature } from './volume';

// Short aliases
export {
  bufferFeature as buffer,
  playbackFeature as playback,
  presentationFeature as presentation,
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
  presentationFeature,
] as const;

export const audio = [playbackFeature, volumeFeature, timeFeature, sourceFeature, bufferFeature] as const;
