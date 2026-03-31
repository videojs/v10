import { ReactiveElement } from '@videojs/element';
import {
  applyShadowStyles,
  createShadowStyle,
  createTemplate,
  ensureGlobalStyle,
  type ShadowStyle,
} from '@videojs/utils/dom';
import rootStyles from './base.css?inline';
import sharedStyles from './shared.css?inline';

const STYLES_ID = '__media-styles';
const sharedSheet = createShadowStyle(sharedStyles);
const templateCache = new WeakMap<Function, HTMLTemplateElement>();

function resolveTemplate(ctor: typeof SkinElement): HTMLTemplateElement | undefined {
  let template = templateCache.get(ctor);
  if (template) return template;

  if (ctor.getTemplateHTML) {
    template = createTemplate(ctor.getTemplateHTML()) ?? undefined;
    if (template) templateCache.set(ctor, template);
  }

  return template;
}

/**
 * Base element for skin definitions. Attaches a shadow root, clones
 * the template from `static getTemplateHTML` into it, and applies
 * shared + per-skin styles via `adoptedStyleSheets` (or `<style>` fallback).
 *
 * The template is lazily created and cached per subclass on first construction.
 */
export class SkinElement extends ReactiveElement {
  static shadowRootOptions: ShadowRootInit = { mode: 'open' };
  static styles?: ShadowStyle;
  static getTemplateHTML?: () => string;

  constructor() {
    super();

    ensureGlobalStyle(STYLES_ID, rootStyles);

    if (!this.shadowRoot) {
      const ctor = this.constructor as typeof SkinElement;
      this.attachShadow(ctor.shadowRootOptions);

      const template = resolveTemplate(ctor);
      if (template) {
        this.shadowRoot!.appendChild(this.ownerDocument.importNode(template.content, true));
      }

      const sheets: ShadowStyle[] = [sharedSheet];
      if (ctor.styles) {
        sheets.push(ctor.styles);
      }
      applyShadowStyles(this.shadowRoot!, sheets);
    }
  }
}
