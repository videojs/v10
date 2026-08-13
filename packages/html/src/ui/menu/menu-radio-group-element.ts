import { type Text, type Translator, translateText } from '@videojs/core/i18n';
import type { PropertyValues } from '@videojs/element';

import { RadioGroupElement } from '../radio-group/radio-group-element';
import { MenuGroupController } from './menu-group-controller';
import type { MenuRadioItemElement } from './menu-radio-item-element';

export class MenuRadioGroupElement extends RadioGroupElement {
  static readonly tagName: string = 'media-menu-radio-group';

  readonly #group = new MenuGroupController(this);
  #ariaLabel: string | null = null;

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    this.#group.applyProps();
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
