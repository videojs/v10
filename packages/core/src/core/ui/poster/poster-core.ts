import type { MediaMetadataState, MediaPlaybackState } from '@videojs/media';

/**
 * The slices the poster composes: `playback` decides whether it shows,
 * `metadata` resolves what it shows. Composed here rather than in each binding
 * so the resolution is written and tested once.
 */
export type PosterMediaState = Pick<MediaPlaybackState, 'started'> & Pick<MediaMetadataState, 'poster'>;

export interface PosterState {
  visible: boolean;
  /** Resolved poster URL, empty when nothing supplied one. */
  src: string;
}

export class PosterCore {
  #media: PosterMediaState | null = null;

  setMedia(media: PosterMediaState): void {
    this.#media = media;
  }

  getState(): PosterState {
    const media = this.#media!;
    return {
      visible: !media.started,
      src: media.poster,
    };
  }
}

export namespace PosterCore {
  export type State = PosterState;
  export type MediaState = PosterMediaState;
}
