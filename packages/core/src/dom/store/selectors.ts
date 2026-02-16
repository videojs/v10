import { createSelector } from '@videojs/store';

import { bufferFeature } from './features/buffer';
import { controlsFeature } from './features/controls';
import { fullscreenFeature } from './features/fullscreen';
import { pipFeature } from './features/pip';
import { playbackFeature } from './features/playback';
import { sourceFeature } from './features/source';
import { timeFeature } from './features/time';
import { volumeFeature } from './features/volume';

/** Select the buffer state (buffered ranges, percent buffered). */
export const selectBuffer = createSelector(bufferFeature);
/** Select the controls state (controls visible, user-active). */
export const selectControls = createSelector(controlsFeature);
/** Select the fullscreen state (fullscreen active, availability). */
export const selectFullscreen = createSelector(fullscreenFeature);
/** Select the PiP state (picture-in-picture active, availability). */
export const selectPiP = createSelector(pipFeature);
/** Select the playback state (paused, ended, play, pause, toggle). */
export const selectPlayback = createSelector(playbackFeature);
/** Select the source state (src, type). */
export const selectSource = createSelector(sourceFeature);
/** Select the time state (currentTime, duration, seek). */
export const selectTime = createSelector(timeFeature);
/** Select the volume state (volume, muted, setVolume, setMuted). */
export const selectVolume = createSelector(volumeFeature);
