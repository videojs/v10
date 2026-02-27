import { features } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import '../media/container';

const { ProviderMixin } = createPlayer({
  features: features.audio,
});

export class AudioPlayerElement extends ProviderMixin(MediaElement) {
  static readonly tagName = 'audio-player';
}

customElements.define(AudioPlayerElement.tagName, AudioPlayerElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioPlayerElement.tagName]: AudioPlayerElement;
  }
}
