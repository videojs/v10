import { audioFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const { PlayerElement, PlayerController: ConfiguredPlayerController } = createPlayer({
  features: audioFeatures,
});

/** Player controller bound to the standard audio player store. */
export const PlayerController = ConfiguredPlayerController;

export class AudioPlayerElement extends PlayerElement {
  static readonly tagName = 'audio-player';
}

declare global {
  interface HTMLElementTagNameMap {
    [AudioPlayerElement.tagName]: AudioPlayerElement;
  }
}
