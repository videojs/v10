interface MediaState {
  playing: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  buffered: number;
  fullscreen: boolean;
}

interface PlaybackState {
  playing: boolean;
}

interface VolumeState {
  volume: number;
}

interface TimeState {
  currentTime: number;
  duration: number;
}

/** Select playback state from media state. */
export function selectPlayback(state: MediaState): PlaybackState {
  return { playing: state.playing };
}

/** Select volume state from media state. */
export function selectVolume(state: MediaState): VolumeState {
  return { volume: state.volume };
}

/** Select time state from media state. */
export function selectTime(state: MediaState): TimeState {
  return { currentTime: state.currentTime, duration: state.duration };
}
