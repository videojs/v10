import { ReactiveElement } from '@videojs/element';
import { ensureGlobalStyle } from '@videojs/utils/dom';
import { safeDefine } from '../safe-define';
import styles from './skin.css?inline';

const STYLES_ID = '__media-background-styles';

function getTemplateHTML() {
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
      this.shadowRoot!.innerHTML = getTemplateHTML();
    }
  }
}

safeDefine(BackgroundVideoSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoSkinElement.tagName]: BackgroundVideoSkinElement;
  }
}
