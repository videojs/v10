import type { MediaPlaybackState } from '@videojs/media';

export interface PosterState {
  visible: boolean;
}

/** Framework-neutral poster component props. */
export interface PosterProps {
  src?: string | undefined;
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
