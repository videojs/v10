import { backgroundFeatures } from '@videojs/core/dom';

import { createPlayer } from '../../player/create-player';

const { PlayerElement, PlayerController: BackgroundVideoPlayerController } = createPlayer({
  features: backgroundFeatures,
});

/** Player controller bound to the background video player store. */
export const PlayerController = BackgroundVideoPlayerController;

export class BackgroundVideoPlayerElement extends PlayerElement {
  static readonly tagName = 'background-video-player';
}

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoPlayerElement.tagName]: BackgroundVideoPlayerElement;
  }
}
