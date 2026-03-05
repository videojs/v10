import type { MediaPlaybackState } from '../../media/state';

export interface PosterState {
  visible: boolean;
}

export class PosterCore {
  #media: MediaPlaybackState | null = null;

  setMedia(media: MediaPlaybackState): void {
    this.#media = media;
  }

  getState(): PosterState {
    const media = this.#media!;
    return {
      visible: !media.started,
    };
  }
}

export namespace PosterCore {
  export type State = PosterState;
}
