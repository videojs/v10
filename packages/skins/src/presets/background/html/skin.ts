import { SKIN_HELP_TEXT, SKIN_HELP_URL } from '@videojs/core';
import { ReactiveElement } from '@videojs/element';
import { ensureGlobalStyle } from '@videojs/utils/dom';

import styles from '../../define/background/skin.css?inline';

const STYLES_ID = '__media-background-styles';

function getTemplateHTML() {
  return /* html */ `
    <media-container>
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>
    </media-container>
    <a rel="help" href="${SKIN_HELP_URL}" hidden>${SKIN_HELP_TEXT}</a>
  `;
}

export class BackgroundVideoSkinElement extends ReactiveElement {
  static readonly tagName = 'background-video-skin';
  static shadowRootOptions: ShadowRootInit = { mode: 'open' };
  static getTemplateHTML = getTemplateHTML;

  constructor() {
    super();

    ensureGlobalStyle(STYLES_ID, styles);

    if (!this.shadowRoot) {
      this.attachShadow(BackgroundVideoSkinElement.shadowRootOptions);
      this.shadowRoot!.innerHTML = getTemplateHTML();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoSkinElement.tagName]: BackgroundVideoSkinElement;
  }
}
