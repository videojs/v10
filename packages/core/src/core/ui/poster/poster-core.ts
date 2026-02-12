import type { MediaPlaybackState } from '../../media/state';

export interface PosterState {
  visible: boolean;
}

export class PosterCore {
  getState(media: MediaPlaybackState): PosterState {
    return {
      visible: !media.started,
    };
  }
}

export namespace PosterCore {
  export type State = PosterState;
}
