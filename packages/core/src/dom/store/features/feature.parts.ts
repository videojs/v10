import { bufferFeature } from './buffer';
import { controlsFeature } from './controls';
import { fullscreenFeature } from './fullscreen';
import { liveFeature } from './live';
import { orientationLockFeature } from './orientation-lock';
import { pipFeature } from './pip';
import { playbackFeature } from './playback';
import { playbackRateFeature } from './playback-rate';
import { qualityFeature } from './quality';
import { remotePlaybackFeature } from './remote-playback';
import { sourceFeature } from './source';
import { streamTypeFeature } from './stream-type';
import { textTrackFeature } from './text-track';
import { timeFeature } from './time';
import { volumeFeature } from './volume';

export { audioFeatures, backgroundFeatures, videoFeatures } from './presets';

// Short aliases
export {
  bufferFeature as buffer,
  controlsFeature as controls,
  fullscreenFeature as fullscreen,
  liveFeature as live,
  orientationLockFeature as orientationLock,
  pipFeature as pip,
  playbackFeature as playback,
  playbackRateFeature as playbackRate,
  qualityFeature as quality,
  remotePlaybackFeature as remotePlayback,
  sourceFeature as source,
  streamTypeFeature as streamType,
  textTrackFeature as textTrack,
  timeFeature as time,
  volumeFeature as volume,
};
