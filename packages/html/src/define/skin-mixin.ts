import type { ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';
import rootStyles from './base.css?inline';
import sharedStyles from './shared.css?inline';

const STYLES_ID = '__media-styles';
type SkinStyles = CSSStyleSheet | string;

function ensureRootStyles(): void {
  const doc = globalThis.document;
  if (!doc || doc.getElementById(STYLES_ID)) return;

  const style = doc.createElement('style');
  style.id = STYLES_ID;
  style.textContent = rootStyles;
  doc.head.appendChild(style);
}

function isConstructableStyleSheet(value: SkinStyles): value is CSSStyleSheet {
  return typeof globalThis.CSSStyleSheet !== 'undefined' && value instanceof globalThis.CSSStyleSheet;
}

function getStyleText(style: SkinStyles): string {
  if (typeof style === 'string') return style;

  return Array.from(style.cssRules)
    .map((rule) => rule.cssText)
    .join('\n');
}

function applyShadowStyles(shadowRoot: ShadowRoot, styles: SkinStyles[]): void {
  if (styles.every(isConstructableStyleSheet) && 'adoptedStyleSheets' in shadowRoot) {
    shadowRoot.adoptedStyleSheets = styles;
    return;
  }

  const doc = shadowRoot.ownerDocument;
  for (const styleText of styles.map(getStyleText)) {
    const style = doc.createElement('style');
    style.textContent = styleText;
    shadowRoot.appendChild(style);
  }
}

const sharedSheet = createStyles(sharedStyles);

/**
 * Mixin for skin elements that renders the template from a static
 * `getTemplateHTML` method into a shadow root. Native `<slot>` elements
 * handle light DOM projection automatically.
 *
 * When `static styles` is set, the stylesheet is adopted into the
 * shadow root via `adoptedStyleSheets`.
 */
export function SkinMixin<Base extends Constructor<ReactiveElement>>(
  BaseClass: Base
): Base & { shadowRootOptions: ShadowRootInit; styles?: SkinStyles } {
  class SkinElement extends (BaseClass as Constructor<ReactiveElement>) {
    static shadowRootOptions: ShadowRootInit = { mode: 'open' };
    static styles?: SkinStyles;

    constructor(...args: any[]) {
      super(...args);

      ensureRootStyles();

      if (!this.shadowRoot) {
        const ctor = this.constructor as typeof SkinElement & { getTemplateHTML?: () => string };
        this.attachShadow(ctor.shadowRootOptions);

        if (ctor.getTemplateHTML) {
          this.shadowRoot!.innerHTML = ctor.getTemplateHTML();
        }

        const sheets: SkinStyles[] = [sharedSheet];
        if (ctor.styles) {
          sheets.push(ctor.styles);
        }
        applyShadowStyles(this.shadowRoot!, sheets);
      }
    }
  }

  return SkinElement as unknown as Base & { shadowRootOptions: ShadowRootInit; styles?: SkinStyles };
}

/** Create a constructable stylesheet when available, otherwise return raw CSS. */
export function createStyles(css: string): SkinStyles {
  if (typeof globalThis.CSSStyleSheet === 'undefined') {
    return css;
  }

  const sheet = new globalThis.CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}
