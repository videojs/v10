import { audioFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { MediaContainerElement } from '../media/container-element';

const { ProviderMixin } = createPlayer({
  features: audioFeatures,
});

export class AudioPlayerElement extends ProviderMixin(MediaElement) {
  static readonly tagName = 'audio-player';
}

// Provider must be defined before consumer so the context handshake succeeds during upgrade.
customElements.define(AudioPlayerElement.tagName, AudioPlayerElement);

if (!customElements.get(MediaContainerElement.tagName)) {
  customElements.define(MediaContainerElement.tagName, MediaContainerElement);
}

export { MediaContainerElement };

declare global {
  interface HTMLElementTagNameMap {
    [AudioPlayerElement.tagName]: AudioPlayerElement;
  }
}
