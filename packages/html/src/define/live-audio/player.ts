import { liveAudioFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { ContainerElement } from '../../ui/container/container-element';
import { safeDefine } from '../safe-define';

const { PlayerElement, PlayerController: ConfiguredPlayerController } = createPlayer({
  features: liveAudioFeatures,
});

/** Player controller bound to the live audio player store. */
export const PlayerController = ConfiguredPlayerController;

export class LiveAudioPlayerElement extends PlayerElement {
  static readonly tagName = 'live-audio-player';
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(LiveAudioPlayerElement);
safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveAudioPlayerElement.tagName]: LiveAudioPlayerElement;
  }
}
