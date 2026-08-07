import type { MediaControlsState, MediaMetadataState, MediaPlaybackState } from '@videojs/media';

/**
 * Media state the title reads. Controls and playback are optional so a player
 * composed of `metadataFeature` alone still renders a title.
 */
export type TitleMediaState = MediaMetadataState & Partial<MediaControlsState> & Partial<MediaPlaybackState>;

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

    // Without the controls and playback features there is no show/hide
    // choreography to join, so a title stays visible for as long as it exists.
    const controlsVisible = media.controlsVisible ?? true;
    const paused = media.paused ?? true;

    return {
      title,
      hasTitle,
      visible: hasTitle && controlsVisible && paused,
    };
  }
}

export namespace TitleCore {
  export type State = TitleState;
  export type MediaState = TitleMediaState;
}
