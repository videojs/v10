import { HlsVideo } from '../../media/hls-video';

export class HlsVideoElement extends HlsVideo {
  static readonly tagName = 'hls-video';
}

customElements.define(HlsVideoElement.tagName, HlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsVideoElement.tagName]: HlsVideoElement;
  }
}
