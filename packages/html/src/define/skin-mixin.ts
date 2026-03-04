import type { ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';

/**
 * Light DOM stylesheet that bridges CSS custom properties set by skins
 * to native WebKit text track pseudo-elements on the slotted `<video>`.
 *
 * `::slotted(video)::-webkit-media-text-track-container` is invalid per
 * CSS spec, so this bridge lives in light DOM where it can directly
 * target the video element's pseudo-elements.
 */
const NATIVE_CAPTION_BRIDGE_CSS = /* css */ `
.media-skin > video::-webkit-media-text-track-container {
  transition: transform var(--media-caption-track-duration, 150ms) ease-out;
  transition-delay: var(--media-caption-track-delay, 600ms);
  transform: translateY(var(--media-caption-track-y, 0)) scale(0.98);
  z-index: var(--media-caption-track-z, 1);
  font-family: inherit;
}

@media (prefers-reduced-motion: reduce) {
  .media-skin > video::-webkit-media-text-track-container {
    transition-duration: 50ms;
  }
}
`;

const BRIDGE_ID = 'media-caption-bridge';

function ensureCaptionBridge(): void {
  if (document.getElementById(BRIDGE_ID)) return;
  const style = document.createElement('style');
  style.id = BRIDGE_ID;
  style.textContent = NATIVE_CAPTION_BRIDGE_CSS;
  document.head.appendChild(style);
}

/**
 * Mixin for skin elements that renders the template from a static
 * `getTemplateHTML` method into a shadow root. Native `<slot>` elements
 * handle light DOM projection automatically.
 *
 * When `static styles` is set, the stylesheet is adopted into the shadow
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

      this.classList.add('media-skin');
      ensureCaptionBridge();

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
