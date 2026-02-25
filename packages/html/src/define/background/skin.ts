import { ReactiveElement } from '@videojs/element';
import styles from './styles.css';

function getTemplateHTML(_attrs: Record<string, string>) {
  return /*html*/ `
    <style>${styles}</style>
    <media-container>
      <slot name="media" slot="media"></slot>
    </media-container>
  `;
}

export class BackgroundVideoSkinElement extends ReactiveElement {
  static readonly tagName = 'background-video-skin';
  static shadowRootOptions = { mode: 'open' as ShadowRootMode };
  static getTemplateHTML = getTemplateHTML;

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow((this.constructor as typeof BackgroundVideoSkinElement).shadowRootOptions);
      this.shadowRoot!.innerHTML = getTemplateHTML(namedNodeMapToObject(this.attributes));
    }
  }
}

function namedNodeMapToObject(namedNodeMap: NamedNodeMap) {
  const obj: Record<string, string> = {};
  for (const attr of namedNodeMap) {
    obj[attr.name] = attr.value;
  }
  return obj;
}

customElements.define(BackgroundVideoSkinElement.tagName, BackgroundVideoSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoSkinElement.tagName]: BackgroundVideoSkinElement;
  }
}
