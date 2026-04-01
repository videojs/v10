import { ReactiveElement } from '@videojs/element';
import { applyShadowStyles, createShadowStyle, ensureGlobalStyle, type ShadowStyle } from '@videojs/utils/dom';
import rootStyles from './base.css?inline';
import sharedStyles from './shared.css?inline';

const STYLES_ID = '__media-styles';
const sharedSheet = createShadowStyle(sharedStyles);

/**
 * Base element for skin definitions. Attaches a shadow root, clones
 * `static template` into it, and applies shared + per-skin styles
 * via `adoptedStyleSheets` (or `<style>` fallback).
 */
export class SkinElement extends ReactiveElement {
  static shadowRootOptions: ShadowRootInit = { mode: 'open' };
  static styles?: ShadowStyle;
  static template?: HTMLTemplateElement | null;

  constructor() {
    super();

    ensureGlobalStyle(STYLES_ID, rootStyles);

    if (!this.shadowRoot) {
      const ctor = this.constructor as typeof SkinElement;
      this.attachShadow(ctor.shadowRootOptions);

      if (ctor.template) {
        this.shadowRoot!.appendChild(this.ownerDocument.importNode(ctor.template.content, true));
      }

      const sheets: ShadowStyle[] = [sharedSheet];
      if (ctor.styles) {
        sheets.push(ctor.styles);
      }
      applyShadowStyles(this.shadowRoot!, sheets);
    }
  }
}
