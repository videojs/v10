import { ReactiveElement } from '@videojs/element';

function getTemplateHTML() {
  return /*html*/ `<div></div>`;
}

export class MinimalAudioSkinElement extends ReactiveElement {
  static readonly tagName = 'audio-minimal-skin';
  static getTemplateHTML = getTemplateHTML;

  constructor() {
    super();
    const children = [...this.childNodes];
    this.innerHTML = getTemplateHTML();
    const container = this.firstElementChild;
    if (container) for (const child of children) container.append(child);
  }
}

customElements.define(MinimalAudioSkinElement.tagName, MinimalAudioSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [MinimalAudioSkinElement.tagName]: MinimalAudioSkinElement;
  }
}
