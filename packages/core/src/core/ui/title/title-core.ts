import type { MediaMetadataState } from '@videojs/media';

export interface TitleState {
  /** The resolved content title. Empty when no source supplied one. */
  title: MediaMetadataState['title'];
  /** Whether the component is hidden because no title is available. */
  hidden: boolean;
}

export class TitleCore {
  getState(media: MediaMetadataState): TitleState {
    const { title } = media;

    return {
      title,
      hidden: title.length === 0,
    };
  }
}

export namespace TitleCore {
  export type State = TitleState;
}
