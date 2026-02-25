import { ReactiveElement } from '@videojs/element';

export class AudioSkinElement extends ReactiveElement {
  static readonly tagName = 'audio-skin';
}

customElements.define(AudioSkinElement.tagName, AudioSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioSkinElement.tagName]: AudioSkinElement;
  }
}
