import { bufferFeature } from './buffer';
import { playbackFeature } from './playback';
import { sourceFeature } from './source';
import { timeFeature } from './time';
import { volumeFeature } from './volume';

// Short aliases
export {
  bufferFeature as buffer,
  playbackFeature as playback,
  sourceFeature as source,
  timeFeature as time,
  volumeFeature as volume,
};

/** Base video player features. */
export const video = [playbackFeature, volumeFeature, timeFeature, sourceFeature, bufferFeature] as const;

/** Base audio player features. */
export const audio = [playbackFeature, volumeFeature, timeFeature, sourceFeature, bufferFeature] as const;
