import type { PlaybackState } from '../../media/state';

export interface PosterState {
  /** Whether the poster should be visible (playback has not started). */
  visible: boolean;
}

export class PosterCore {
  getState(playback: PlaybackState): PosterState {
    return {
      visible: !playback.started,
    };
  }
}

export namespace PosterCore {
  export type State = PosterState;
}
