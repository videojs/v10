import { liveAudioFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { ContainerElement } from '../../ui/container/container-element';
import { safeDefine } from '../safe-define';

const { PlayerElement, PlayerController: LiveAudioPlayerController } = createPlayer({
  features: liveAudioFeatures,
});

/** Player controller bound to the live audio player store. */
export const PlayerController = LiveAudioPlayerController;

export class LiveAudioPlayerElement extends PlayerElement {
  static readonly tagName = 'live-audio-player';
}

// The player must be defined before consumers for context handshakes during upgrade.
safeDefine(LiveAudioPlayerElement);
safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveAudioPlayerElement.tagName]: LiveAudioPlayerElement;
  }
}
