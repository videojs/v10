import { features } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const { PlayerElement } = createPlayer({
  features: features.video,
});

export class VideoPlayerElement extends PlayerElement {
  static readonly tagName = 'video-player';
}

customElements.define(VideoPlayerElement.tagName, VideoPlayerElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoPlayerElement.tagName]: VideoPlayerElement;
  }
}
