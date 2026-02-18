import { HlsVideo } from '../../media/hls-video/hls-video-element';

export class HlsVideoElement extends HlsVideo {
  static readonly tagName = 'hls-video';
}

customElements.define(HlsVideoElement.tagName, HlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsVideoElement.tagName]: HlsVideoElement;
  }
}
