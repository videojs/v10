import { SimpleHlsVideo } from '../../media/simple-hls-video';

export class SimpleHlsVideoElement extends SimpleHlsVideo {
  static readonly tagName = 'simple-hls-video';
}

customElements.define(SimpleHlsVideoElement.tagName, SimpleHlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [SimpleHlsVideoElement.tagName]: SimpleHlsVideoElement;
  }
}
