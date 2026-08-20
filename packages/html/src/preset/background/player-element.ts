import { backgroundFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const { PlayerElement, PlayerController: ConfiguredPlayerController } = createPlayer({
  features: backgroundFeatures,
});

/** Player controller bound to the background video player store. */
export const PlayerController = ConfiguredPlayerController;

export class BackgroundVideoPlayerElement extends PlayerElement {
  static readonly tagName = 'background-video-player';
}

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoPlayerElement.tagName]: BackgroundVideoPlayerElement;
  }
}
