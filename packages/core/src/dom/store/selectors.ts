import { createFeatureSelector } from '@videojs/store';

import { bufferFeature } from './features/buffer';
import { playbackFeature } from './features/playback';
import { sourceFeature } from './features/source';
import { timeFeature } from './features/time';
import { volumeFeature } from './features/volume';

export const selectBuffer = createFeatureSelector(bufferFeature);
export const selectPlayback = createFeatureSelector(playbackFeature);
export const selectSource = createFeatureSelector(sourceFeature);
export const selectTime = createFeatureSelector(timeFeature);
export const selectVolume = createFeatureSelector(volumeFeature);
