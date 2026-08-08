import type { MediaMetadataState, MediaPlaybackState } from '@videojs/media';

/**
 * The slices the placeholder composes: `playback` decides whether it shows,
 * `metadata` resolves what it shows. Composed here rather than in each binding
 * so the resolution is written and tested once.
 */
export type PlaceholderMediaState = Pick<MediaPlaybackState, 'started'> & Pick<MediaMetadataState, 'placeholder'>;

export interface PlaceholderState {
  visible: boolean;
  /** Resolved placeholder URL, empty when nothing supplied one. */
  src: string;
}

export class PlaceholderCore {
  #media: PlaceholderMediaState | null = null;

  setMedia(media: PlaceholderMediaState): void {
    this.#media = media;
  }

  getState(): PlaceholderState {
    const media = this.#media!;
    return {
      visible: !media.started,
      src: media.placeholder,
    };
  }
}

export namespace PlaceholderCore {
  export type State = PlaceholderState;
  export type MediaState = PlaceholderMediaState;
}
