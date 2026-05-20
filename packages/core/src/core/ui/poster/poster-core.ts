import type { MediaPlaybackState } from '../../media/state';

/** Reactive state surfaced by the poster core. */
export interface PosterState {
  /** Whether the poster image should be visible (before playback starts). */
  visible: boolean;
}

/** Behavior core for the poster — hides the image once playback has started. */
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
  /** Alias for {@link PosterState}. */
  export type State = PosterState;
}
