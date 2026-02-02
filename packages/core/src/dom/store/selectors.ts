import { createSelector } from '@videojs/store';

import { bufferFeature } from './features/buffer';
import { playbackFeature } from './features/playback';
import { sourceFeature } from './features/source';
import { timeFeature } from './features/time';
import { volumeFeature } from './features/volume';

export const selectBuffer = createSelector(bufferFeature);
export const selectPlayback = createSelector(playbackFeature);
export const selectSource = createSelector(sourceFeature);
export const selectTime = createSelector(timeFeature);
export const selectVolume = createSelector(volumeFeature);
