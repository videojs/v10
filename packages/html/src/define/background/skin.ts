import { ReactiveElement } from '@videojs/element';
import { namedNodeMapToObject } from '@videojs/utils/dom';
import { safeDefine } from '../safe-define';

function getTemplateHTML(_attrs: Record<string, string>) {
  return /*html*/ `
    <media-container>
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>
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

safeDefine(BackgroundVideoSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoSkinElement.tagName]: BackgroundVideoSkinElement;
  }
}
