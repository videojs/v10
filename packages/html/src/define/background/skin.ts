import { ReactiveElement } from '@videojs/element';
import { ensureGlobalStyle, namedNodeMapToObject } from '@videojs/utils/dom';
import { safeDefine } from '../safe-define';
import styles from './skin.css?inline';

const STYLES_ID = '__media-background-styles';

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

    ensureGlobalStyle(STYLES_ID, styles);

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
