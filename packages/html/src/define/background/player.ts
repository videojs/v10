import { backgroundFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { MediaContainerElement } from '../media/container-element';

const { ProviderMixin } = createPlayer({
  features: backgroundFeatures,
});

export class BackgroundVideoPlayerElement extends ProviderMixin(MediaElement) {
  static readonly tagName = 'background-video-player';
}

// Provider must be defined before consumer so the context handshake succeeds during upgrade.
customElements.define(BackgroundVideoPlayerElement.tagName, BackgroundVideoPlayerElement);

if (!customElements.get(MediaContainerElement.tagName)) {
  customElements.define(MediaContainerElement.tagName, MediaContainerElement);
}

export { MediaContainerElement };

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoPlayerElement.tagName]: BackgroundVideoPlayerElement;
  }
}
