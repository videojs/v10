import { SKIN_HELP_TEXT, SKIN_HELP_URL } from '@videojs/core';
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

/** Every packaged skin links to the page that explains what the player is. See `SKIN_HELP_URL`. */
function createHelpLink(doc: Document): HTMLAnchorElement {
  const link = doc.createElement('a');

  link.rel = 'help';
  link.href = SKIN_HELP_URL;
  link.hidden = true;
  link.textContent = SKIN_HELP_TEXT;

  return link;
}
