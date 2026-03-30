import { ReactiveElement } from '@videojs/element';
import { applyShadowStyles, createShadowStyle, type ShadowStyle } from '@videojs/utils/dom';
import rootStyles from './base.css?inline';
import sharedStyles from './shared.css?inline';

const STYLES_ID = '__media-styles';

function ensureRootStyles(): void {
  const doc = globalThis.document;
  if (!doc || doc.getElementById(STYLES_ID)) return;

  const style = doc.createElement('style');
  style.id = STYLES_ID;
  style.textContent = rootStyles;
  doc.head.appendChild(style);
}

const sharedSheet = createShadowStyle(sharedStyles);

/**
 * Base element for skin definitions. Attaches a shadow root, renders
 * the template from `static getTemplateHTML`, and applies shared +
 * per-skin styles via `adoptedStyleSheets` (or `<style>` fallback).
 */
export class SkinElement extends ReactiveElement {
  static shadowRootOptions: ShadowRootInit = { mode: 'open' };
  static styles?: ShadowStyle;
  static getTemplateHTML?: () => string;

  constructor() {
    super();

    ensureRootStyles();

    if (!this.shadowRoot) {
      const ctor = this.constructor as typeof SkinElement;
      this.attachShadow(ctor.shadowRootOptions);

      if (ctor.getTemplateHTML) {
        this.shadowRoot!.innerHTML = ctor.getTemplateHTML();
      }

      const sheets: ShadowStyle[] = [sharedSheet];
      if (ctor.styles) {
        sheets.push(ctor.styles);
      }
      applyShadowStyles(this.shadowRoot!, sheets);
    }
  }
}
