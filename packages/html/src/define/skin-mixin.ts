import type { ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';
import rootStyles from './base.css?inline';
import sharedStyles from './shared.css?inline';

const STYLES_ID = '__media-styles';

function ensureRootStyles(): void {
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = rootStyles;
  document.head.appendChild(style);
}

const sharedSheet = new CSSStyleSheet();
sharedSheet.replaceSync(sharedStyles);

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
): Base & { shadowRootOptions: ShadowRootInit; styles?: CSSStyleSheet } {
  class SkinElement extends (BaseClass as Constructor<ReactiveElement>) {
    static shadowRootOptions: ShadowRootInit = { mode: 'open' };
    static styles?: CSSStyleSheet;

    constructor(...args: any[]) {
      super(...args);

      ensureRootStyles();

      if (!this.shadowRoot) {
        const ctor = this.constructor as typeof SkinElement & { getTemplateHTML?: () => string };
        this.attachShadow(ctor.shadowRootOptions);

        const sheets: CSSStyleSheet[] = [sharedSheet];
        if (ctor.styles) {
          sheets.push(ctor.styles);
        }
        this.shadowRoot!.adoptedStyleSheets = sheets;

        if (ctor.getTemplateHTML) {
          this.shadowRoot!.innerHTML = ctor.getTemplateHTML();
        }
      }
    }
  }

  return SkinElement as unknown as Base & { shadowRootOptions: ShadowRootInit; styles?: CSSStyleSheet };
}

/** Create a shared `CSSStyleSheet` from a CSS string. */
export function createStyles(css: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}
