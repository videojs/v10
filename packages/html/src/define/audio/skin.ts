import { ReactiveElement } from '@videojs/element';

function getTemplateHTML() {
  return /*html*/ `<div></div>`;
}

export class AudioSkinElement extends ReactiveElement {
  static readonly tagName = 'audio-skin';
  static getTemplateHTML = getTemplateHTML;

  constructor() {
    super();
    const children = [...this.childNodes];
    this.innerHTML = getTemplateHTML();
    const container = this.firstElementChild;
    if (container) for (const child of children) container.append(child);
  }
}

customElements.define(AudioSkinElement.tagName, AudioSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioSkinElement.tagName]: AudioSkinElement;
  }
}
