import { createSelector } from '@videojs/store';

import { bufferFeature } from './features/buffer';
import { controlsFeature } from './features/controls';
import { fullscreenFeature } from './features/fullscreen';
import { pipFeature } from './features/pip';
import { playbackFeature } from './features/playback';
import { playbackRateFeature } from './features/playback-rate';
import { sourceFeature } from './features/source';
import { textTrackFeature } from './features/text-track';
import { timeFeature } from './features/time';
import { volumeFeature } from './features/volume';

/** Select the buffer state (buffered ranges, percent buffered). */
export const selectBuffer = createSelector('buffer', bufferFeature);
/** Select the controls state (controls visible, user-active). */
export const selectControls = createSelector('controls', controlsFeature);
/** Select the fullscreen state (fullscreen active, availability). */
export const selectFullscreen = createSelector('fullscreen', fullscreenFeature);
/** Select the PiP state (picture-in-picture active, availability). */
export const selectPiP = createSelector('pip', pipFeature);
/** Select the playback state (paused, ended, play, pause, toggle). */
export const selectPlayback = createSelector('playback', playbackFeature);
/** Select the playback rate state (playbackRate, playbackRates, setPlaybackRate). */
export const selectPlaybackRate = createSelector('playbackRate', playbackRateFeature);
/** Select the source state (src, type). */
export const selectSource = createSelector('source', sourceFeature);
/** Select the text track state (chapters cues, thumbnail cues). */
export const selectTextTrack = createSelector('textTrack', textTrackFeature);
/** Select the time state (currentTime, duration, seek). */
export const selectTime = createSelector('time', timeFeature);
/** Select the volume state (volume, muted, setVolume, setMuted). */
export const selectVolume = createSelector('volume', volumeFeature);
