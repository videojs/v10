import { bufferFeature } from './buffer';
import { playbackFeature } from './playback';
import { sourceFeature } from './source';
import { timeFeature } from './time';
import { volumeFeature } from './volume';

export {
  bufferFeature as buffer,
  playbackFeature as playback,
  sourceFeature as source,
  timeFeature as time,
  volumeFeature as volume,
};

export const all = [bufferFeature, playbackFeature, sourceFeature, timeFeature, volumeFeature] as const;
