import { BackgroundVideo } from '../../media/background-video/background-video-element';

export class BackgroundVideoElement extends BackgroundVideo {
  static readonly tagName = 'background-video';
}

customElements.define(BackgroundVideoElement.tagName, BackgroundVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoElement.tagName]: BackgroundVideoElement;
  }
}
