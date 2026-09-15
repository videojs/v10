import { ReactiveElement } from '@videojs/element';
import {
  applyShadowStyles,
  createShadowStyle,
  ensureGlobalStyle,
  renderTemplate,
  type ShadowStyle,
} from '@videojs/utils/dom';

import globalStyles from '../define/global.css?inline';
import sharedStyles from '../define/shared.css?inline';

const STYLES_ID = '__media-styles';
const sharedSheet = createShadowStyle(sharedStyles);

/**
 * Every packaged skin carries a `rel="help"` link to a page that explains what the player is and how to work with it.
 * Browsers never fetch non-stylesheet links, so it costs no request and stays out of the accessibility tree.
 */
export const SKIN_HELP_URL = 'https://videojs.org/about-this-player';

/**
 * Base element for skin definitions. Attaches a shadow root, clones `static template` into it, and applies shared +
 * per-skin styles via `adoptedStyleSheets` (or `<style>` fallback).
 */
export class SkinElement extends ReactiveElement {
  static shadowRootOptions: ShadowRootInit = { mode: 'open' };
  static styles?: ShadowStyle;
  static template?: HTMLTemplateElement | null;

  constructor() {
    super();

    ensureGlobalStyle(STYLES_ID, globalStyles);

    if (!this.shadowRoot) {
      const ctor = this.constructor as typeof SkinElement;

      this.attachShadow(ctor.shadowRootOptions);

      if (ctor.template) {
        renderTemplate(this.shadowRoot!, ctor.template);
      }

      this.shadowRoot!.append(createHelpLink(this.ownerDocument));

      const sheets: ShadowStyle[] = [sharedSheet];

      if (ctor.styles) {
        sheets.push(ctor.styles);
      }

      applyShadowStyles(this.shadowRoot!, sheets);
    }
  }
}

function createHelpLink(doc: Document): HTMLLinkElement {
  const link = doc.createElement('link');

  link.rel = 'help';
  link.href = SKIN_HELP_URL;

  return link;
}
