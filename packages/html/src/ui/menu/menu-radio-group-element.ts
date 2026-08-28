import type { MenuOptionState } from '@videojs/core';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { findElementChild } from '@videojs/utils/dom';

import { RadioGroupElement } from '../radio-group/radio-group-element';
import { type MenuContextValue, menuContext } from './context';
import { MenuGroupController } from './menu-group-controller';
import { MenuRadioItemElement } from './menu-radio-item-element';

export class MenuRadioGroupElement extends RadioGroupElement {
  static readonly tagName: string = 'media-menu-radio-group';

  readonly #group = new MenuGroupController(this);
  readonly #menu = new ContextConsumer(this, { context: menuContext, subscribe: true });
  readonly #optionSource = Symbol('menu-option');
  #ariaLabel: string | null = null;
  #optionMenu: MenuContextValue['menu'] | null = null;
  #setOptionState: MenuContextValue['setOptionState'] | null = null;

  override disconnectedCallback(): void {
    this.#clearMenuOptionState();
    super.disconnectedCallback();
  }

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

  /** Applies a generated fallback without replacing an author-provided accessible name. */
  protected applyDefaultAriaLabel(label: string): void {
    if (this.hasAttribute('aria-labelledby')) return;

    const current = this.getAttribute('aria-label');
    if (current !== null && current !== this.#ariaLabel) return;

    this.#ariaLabel = label;
    this.setAttribute('aria-label', label);
  }

  protected publishMenuOptionState(
    disabled: boolean,
    hidden: boolean,
    availability: MenuOptionState['availability']
  ): void {
    const context = this.#menu.value ?? null;

    if (context?.menu !== this.#optionMenu) {
      this.#clearMenuOptionState();
      this.#optionMenu = context?.menu ?? null;
      this.#setOptionState = context?.setOptionState ?? null;
    }

    if (!this.#setOptionState) return;

    const selectedItem = findElementChild(
      this,
      (item): item is MenuRadioItemElement => item instanceof MenuRadioItemElement && item.value === this.value
    );
    const label = selectedItem?.querySelector<HTMLElement>('[data-part~="label"]')?.textContent;
    const value = label ?? selectedItem?.textContent?.trim() ?? '';

    this.#setOptionState(this.#optionSource, { value, disabled, hidden, availability });
  }

  #clearMenuOptionState(): void {
    this.#setOptionState?.(this.#optionSource, null);
    this.#optionMenu = null;
    this.#setOptionState = null;
  }
}
