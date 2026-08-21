import { liveVideoFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const { PlayerElement, PlayerController: ConfiguredPlayerController } = createPlayer({
  features: liveVideoFeatures,
});

/** Player controller bound to the live video player store. */
export const PlayerController = ConfiguredPlayerController;

export class LiveVideoPlayerElement extends PlayerElement {
  static readonly tagName = 'live-video-player';
}

declare global {
  interface HTMLElementTagNameMap {
    [LiveVideoPlayerElement.tagName]: LiveVideoPlayerElement;
  }
}
