import { createSelector } from '@videojs/store';

import { bufferFeature } from './features/buffer';
import { controlsFeature } from './features/controls';
import { fullscreenFeature } from './features/fullscreen';
import { pipFeature } from './features/pip';
import { playbackFeature } from './features/playback';
import { sourceFeature } from './features/source';
import { timeFeature } from './features/time';
import { volumeFeature } from './features/volume';

export const selectBuffer = createSelector(bufferFeature);
export const selectControls = createSelector(controlsFeature);
export const selectFullscreen = createSelector(fullscreenFeature);
export const selectPiP = createSelector(pipFeature);
export const selectPlayback = createSelector(playbackFeature);
export const selectSource = createSelector(sourceFeature);
export const selectTime = createSelector(timeFeature);
export const selectVolume = createSelector(volumeFeature);
