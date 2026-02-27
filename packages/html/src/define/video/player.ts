import { features } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import '../media/container';

const { ProviderMixin } = createPlayer({
  features: features.video,
});

export class VideoPlayerElement extends ProviderMixin(MediaElement) {
  static readonly tagName = 'video-player';
}

customElements.define(VideoPlayerElement.tagName, VideoPlayerElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoPlayerElement.tagName]: VideoPlayerElement;
  }
}
