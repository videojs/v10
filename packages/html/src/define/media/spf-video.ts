import { SpfVideo } from '../../media/spf-video-element';

export class SpfVideoElement extends SpfVideo {
  static readonly tagName = 'spf-video';
}

customElements.define(SpfVideoElement.tagName, SpfVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [SpfVideoElement.tagName]: SpfVideoElement;
  }
}
