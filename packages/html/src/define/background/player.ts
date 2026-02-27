import { features } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';

const { ProviderMixin } = createPlayer({
  features: features.background,
});

export class BackgroundVideoPlayerElement extends ProviderMixin(MediaElement) {
  static readonly tagName = 'background-video-player';
}

customElements.define(BackgroundVideoPlayerElement.tagName, BackgroundVideoPlayerElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoPlayerElement.tagName]: BackgroundVideoPlayerElement;
  }
}
