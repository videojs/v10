import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { findElementChild } from '@videojs/utils/dom';

import { RadioGroupElement } from '../radio-group/radio-group-element';
import { type MenuContextValue, type MenuTriggerState, menuContext } from './context';
import { MenuGroupController } from './menu-group-controller';
import { MenuRadioItemElement } from './menu-radio-item-element';

export class MenuRadioGroupElement extends RadioGroupElement {
  static readonly tagName: string = 'media-menu-radio-group';

  readonly #group = new MenuGroupController(this);
  readonly #menu = new ContextConsumer(this, { context: menuContext, subscribe: true });
  #ariaLabel: string | null = null;
  #triggerMenu: MenuContextValue['menu'] | null = null;
  #setTriggerState: ((state: MenuTriggerState) => void) | null = null;

  override disconnectedCallback(): void {
    this.#clearMenuTriggerState();
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

  protected publishMenuTriggerState(
    disabled: boolean,
    availability?: 'available' | 'unavailable' | 'unsupported'
  ): void {
    const context = this.#menu.value ?? null;

    if (context?.menu !== this.#triggerMenu) {
      this.#clearMenuTriggerState();
      this.#triggerMenu = context?.menu ?? null;
      this.#setTriggerState = context?.setTriggerState ?? null;
    }

    if (!this.#setTriggerState) return;

    const selectedItem = findElementChild(
      this,
      (item): item is MenuRadioItemElement => item instanceof MenuRadioItemElement && item.value === this.value
    );
    const label = selectedItem?.querySelector<HTMLElement>('[data-part~="label"]')?.textContent;
    const hint = label ?? selectedItem?.textContent?.trim() ?? '';

    this.#setTriggerState({ hint, disabled, availability });
  }

  #clearMenuTriggerState(): void {
    this.#setTriggerState?.({ hint: '', disabled: false });
    this.#triggerMenu = null;
    this.#setTriggerState = null;
  }
}
