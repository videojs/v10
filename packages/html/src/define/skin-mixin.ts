import type { ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';

/**
 * Mixin for skin elements that renders the template from a static
 * `getTemplateHTML` method into a shadow root. Native `<slot>` elements
 * handle light DOM projection automatically.
 *
 * Consumers should include `@videojs/html/base.css` in light DOM for
 * provider layout defaults and native caption bridge styles. When
 * `static styles` is set, the stylesheet is adopted into the shadow
 * root via `adoptedStyleSheets`.
 */
export function SkinMixin<Base extends Constructor<ReactiveElement>>(
  BaseClass: Base
): Base & { shadowRootOptions: ShadowRootInit; styles?: CSSStyleSheet } {
  class SkinElement extends (BaseClass as Constructor<ReactiveElement>) {
    static shadowRootOptions: ShadowRootInit = { mode: 'open' };
    static styles?: CSSStyleSheet;

    constructor(...args: any[]) {
      super(...args);

      if (!this.shadowRoot) {
        const ctor = this.constructor as typeof SkinElement & { getTemplateHTML?: () => string };
        this.attachShadow(ctor.shadowRootOptions);

        if (ctor.styles) {
          this.shadowRoot!.adoptedStyleSheets = [ctor.styles];
        }

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
