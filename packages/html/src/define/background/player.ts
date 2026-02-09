import { features } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const { PlayerElement } = createPlayer({
  features: features.background,
});

export class BackgroundVideoPlayerElement extends PlayerElement {
  static readonly tagName = 'background-video-player';
}

customElements.define(BackgroundVideoPlayerElement.tagName, BackgroundVideoPlayerElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoPlayerElement.tagName]: BackgroundVideoPlayerElement;
  }
}
