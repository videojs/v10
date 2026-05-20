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

/**
 * Background video skin web component — a minimal container with no user-facing UI.
 *
 * Used to render ambient/looping video. To customize, eject this skin and build from primitives. Read more about eject in the docs.
 *
 * @see https://videojs.org/docs/framework/html/concepts/skins
 */
export class BackgroundVideoSkinElement extends ReactiveElement {
  /** Custom element tag name. */
  static readonly tagName = 'background-video-skin';
  /** Shadow DOM options applied during construction. */
  static shadowRootOptions = { mode: 'open' as ShadowRootMode };
  /** Builds the shadow DOM HTML from the host's attributes. */
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
