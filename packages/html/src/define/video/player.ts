import { videoFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { MediaContainerElement } from '../media/container-element';

const { ProviderMixin } = createPlayer({
  features: videoFeatures,
});

export class VideoPlayerElement extends ProviderMixin(MediaElement) {
  static readonly tagName = 'video-player';
}

// Provider must be defined before consumer so the context handshake succeeds during upgrade.
customElements.define(VideoPlayerElement.tagName, VideoPlayerElement);

if (!customElements.get(MediaContainerElement.tagName)) {
  customElements.define(MediaContainerElement.tagName, MediaContainerElement);
}

export { MediaContainerElement };

declare global {
  interface HTMLElementTagNameMap {
    [VideoPlayerElement.tagName]: VideoPlayerElement;
  }
}
