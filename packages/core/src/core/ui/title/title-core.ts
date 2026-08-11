import type { MediaControlsState, MediaMetadataState } from '@videojs/media';

/**
 * Media state the title reads, composed by the HTML and React `Title` adapters
 * from the `metadata` and `controls` store slices.
 *
 * Every field is required. A player can leave out `controlsFeature` — the audio
 * presets do — so the adapters substitute the neutral value that means "nothing
 * here hides the title".
 */
export type TitleMediaState = Pick<MediaMetadataState, 'contentTitle'> & Pick<MediaControlsState, 'controlsVisible'>;

export interface TitleState {
  /** The resolved content title. Empty when no source supplied one. */
  title: MediaMetadataState['contentTitle'];
  /** Whether a title is present. */
  hasTitle: boolean;
  /** Whether the title should be displayed. */
  visible: boolean;
}

export class TitleCore {
  #media: TitleMediaState | null = null;

  setMedia(media: TitleMediaState): void {
    this.#media = media;
  }

  getState(): TitleState {
    const media = this.#media!;
    const title = media.contentTitle;
    const hasTitle = title.length > 0;

    return {
      title,
      hasTitle,
      // The title is part of the chrome: it comes and goes with the controls
      // that share its edge of the player, and carries the scrim they sit on.
      visible: hasTitle && media.controlsVisible,
    };
  }
}

export namespace TitleCore {
  export type State = TitleState;
  export type MediaState = TitleMediaState;
}
