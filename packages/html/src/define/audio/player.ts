import { features } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const { PlayerElement } = createPlayer({
  features: features.audio,
});

export class AudioPlayerElement extends PlayerElement {
  static readonly tagName = 'audio-player';
}

customElements.define(AudioPlayerElement.tagName, AudioPlayerElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioPlayerElement.tagName]: AudioPlayerElement;
  }
}
