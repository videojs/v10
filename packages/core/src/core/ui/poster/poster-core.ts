import type { MediaPlaybackState } from '../../media/state';
import type { UICore } from '../types';

export interface PosterState {
  visible: boolean;
}

export class PosterCore implements UICore<{}, PosterState> {
  getState(media: MediaPlaybackState): PosterState {
    return {
      visible: !media.started,
    };
  }
}

export namespace PosterCore {
  export type State = PosterState;
}
