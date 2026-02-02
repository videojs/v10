import { features } from '@videojs/core/dom';
import { MediaElement } from '@/ui/media-element';
import { createPlayer } from './create-player';

const { PlayerMixin } = createPlayer({
  features: [...features.video],
});

export class VideoPlayer extends PlayerMixin(MediaElement) {}

customElements.define('video-player', VideoPlayer);

declare global {
  interface HTMLElementTagNameMap {
    'video-player': VideoPlayer;
  }
}
