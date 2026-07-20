import { ReactiveElement } from '@videojs/element';
import {
  applyShadowStyles,
  createShadowStyle,
  ensureGlobalStyle,
  renderTemplate,
  type ShadowStyle,
} from '@videojs/utils/dom';
import globalStyles from './global.css?inline';
import sharedStyles from './shared.css?inline';

const STYLES_ID = '__media-styles';
const sharedSheet = createShadowStyle(sharedStyles);

/**
 * Base element for skin definitions. Attaches a shadow root, clones
 * `static template` into it, and applies shared + per-skin styles
 * via `adoptedStyleSheets` (or `<style>` fallback).
 */
export class SkinElement extends ReactiveElement {
  static get observedAttributes(): string[] {
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return [...super.observedAttributes, 'placeholdersrc'];
  }

  override attributeChangedCallback(attr: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(attr, oldValue, newValue);

    if (attr === 'placeholdersrc') {
      if (newValue) {
        this.style.setProperty('--media-poster-placeholder', `url(${newValue})`);
      } else {
        this.style.removeProperty('--media-poster-placeholder');
      }
    }
  }
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

      const sheets: ShadowStyle[] = [sharedSheet];
      if (ctor.styles) {
        sheets.push(ctor.styles);
      }
      applyShadowStyles(this.shadowRoot!, sheets);
    }
  }
}
