import type { MediaPlaybackState } from '../../media/state';

export interface PosterState {
  visible: boolean;
}

export class PosterCore {
  getState(playback: MediaPlaybackState): PosterState {
    return {
      visible: !playback.started,
    };
  }
}

export namespace PosterCore {
  export type State = PosterState;
}
