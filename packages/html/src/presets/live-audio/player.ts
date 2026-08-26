import { liveAudioFeatures } from '@videojs/core/dom';

import { createPlayer } from '../../player/create-player';

const { PlayerElement, PlayerController: LiveAudioPlayerController } = createPlayer({
  features: liveAudioFeatures,
});

/** Player controller bound to the live audio player store. */
export const PlayerController = LiveAudioPlayerController;

export class LiveAudioPlayerElement extends PlayerElement {
  static readonly tagName = 'live-audio-player';
}

declare global {
  interface HTMLElementTagNameMap {
    [LiveAudioPlayerElement.tagName]: LiveAudioPlayerElement;
  }
}
