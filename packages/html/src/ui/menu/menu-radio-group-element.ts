import { resolveTranslation, type Translator } from '@videojs/core/i18n';
import type { PropertyValues } from '@videojs/element';

import { RadioGroupElement } from '../radio-group/radio-group-element';
import { MenuGroupController } from './menu-group-controller';
import { MenuRadioItemElement } from './menu-radio-item-element';

export class MenuRadioGroupElement extends RadioGroupElement {
  static readonly tagName: string = 'media-menu-radio-group';

  readonly #group = new MenuGroupController(this);
  #ariaLabel: string | null = null;

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    this.#group.applyProps();
  }

  protected getTemplate(): HTMLTemplateElement | null {
    for (const child of this.children) {
      if (child instanceof HTMLTemplateElement) return child;
    }

    return null;
  }

  protected createRadioItem(template: HTMLTemplateElement | null): MenuRadioItemElement {
    if (!template) return document.createElement(MenuRadioItemElement.tagName) as MenuRadioItemElement;

    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const root = fragment.firstElementChild;

    if (!root || root.localName !== MenuRadioItemElement.tagName || root.nextElementSibling) {
      return document.createElement(MenuRadioItemElement.tagName) as MenuRadioItemElement;
    }

    return root as MenuRadioItemElement;
  }

  protected setItemLabel(item: MenuRadioItemElement, label: string): void {
    const labelPart = item.querySelector<HTMLElement>('[data-part~="label"]');

    if (labelPart) {
      labelPart.textContent = label;
    } else {
      item.textContent = label;
    }
  }

  protected applyAriaLabel(translator: Translator, label: string, params?: Record<string, string | number>): void {
    if (this.hasAttribute('aria-labelledby')) return;

    const current = this.getAttribute('aria-label');
    if (current !== null && current !== this.#ariaLabel) return;

    this.#ariaLabel = resolveTranslation(translator, label, params);
    this.setAttribute('aria-label', this.#ariaLabel);
  }
}
