import { audioFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { ContainerElement } from '../../ui/container/container-element';
import { safeDefine } from '../safe-define';

const { PlayerElement, PlayerController: ConfiguredPlayerController } = createPlayer({
  features: audioFeatures,
});

/** Player controller bound to the standard audio player store. */
export const PlayerController = ConfiguredPlayerController;

export class AudioPlayerElement extends PlayerElement {
  static readonly tagName = 'audio-player';
}

// The player must be defined before consumers for context handshakes during upgrade.
safeDefine(AudioPlayerElement);
safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioPlayerElement.tagName]: AudioPlayerElement;
  }
}
