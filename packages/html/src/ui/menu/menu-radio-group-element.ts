import { type Text, type Translator, translateText } from '@videojs/core/i18n';
import type { PropertyValues } from '@videojs/element';
import { cloneTemplateRoot, getTemplateElement, getTemplateRoot } from '@videojs/utils/dom';

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
    return getTemplateElement(this);
  }

  protected createRadioItem(template: HTMLTemplateElement | null): MenuRadioItemElement {
    const root = template ? getTemplateRoot(template) : null;

    if (root?.localName === MenuRadioItemElement.tagName) {
      return cloneTemplateRoot(root, this.ownerDocument) as MenuRadioItemElement;
    }

    return this.ownerDocument.createElement(MenuRadioItemElement.tagName) as MenuRadioItemElement;
  }

  protected setItemLabel(item: MenuRadioItemElement, label: string): void {
    const labelPart = item.querySelector<HTMLElement>('[data-part~="label"]');

    if (labelPart) {
      labelPart.textContent = label;
    } else {
      item.textContent = label;
    }
  }

  protected applyAriaLabel(
    translator: Translator,
    label: Text | string,
    params?: Record<string, string | number>
  ): void {
    if (this.hasAttribute('aria-labelledby')) return;

    const current = this.getAttribute('aria-label');
    if (current !== null && current !== this.#ariaLabel) return;

    this.#ariaLabel = translateText(label, translator, params);
    this.setAttribute('aria-label', this.#ariaLabel);
  }
}
