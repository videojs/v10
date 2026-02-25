import { ReactiveElement } from '@videojs/element';

export class VideoSkinElement extends ReactiveElement {
  static readonly tagName = 'video-skin';
}

customElements.define(VideoSkinElement.tagName, VideoSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoSkinElement.tagName]: VideoSkinElement;
  }
}
