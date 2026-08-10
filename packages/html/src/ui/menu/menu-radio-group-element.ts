import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { RadioGroupElement } from '../radio-group/radio-group-element';
import { type MenuContextValue, type MenuTriggerMetadata, menuContext } from './context';
import { MenuGroupController } from './menu-group-controller';
import { MenuRadioItemElement } from './menu-radio-item-element';

export class MenuRadioGroupElement extends RadioGroupElement {
  static readonly tagName: string = 'media-menu-radio-group';

  readonly #group = new MenuGroupController(this);
  readonly #menu = new ContextConsumer(this, { context: menuContext, subscribe: true });
  #metadataMenu: MenuContextValue['menu'] | null = null;
  #setTriggerMetadata: ((metadata: MenuTriggerMetadata) => void) | null = null;

  override disconnectedCallback(): void {
    this.#clearMenuMetadata();
    super.disconnectedCallback();
  }

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

  protected publishMenuMetadata(disabled: boolean, availability?: 'available' | 'unavailable' | 'unsupported'): void {
    const context = this.#menu.value ?? null;

    if (context?.menu !== this.#metadataMenu) {
      this.#clearMenuMetadata();
      this.#metadataMenu = context?.menu ?? null;
      this.#setTriggerMetadata = context?.setTriggerMetadata ?? null;
    }

    if (!this.#setTriggerMetadata) return;

    const selectedItem = [...this.children].find(
      (item): item is MenuRadioItemElement => item instanceof MenuRadioItemElement && item.value === this.value
    );
    const label = selectedItem?.querySelector<HTMLElement>('[data-part~="label"]')?.textContent;
    const hint = label ?? selectedItem?.textContent?.trim() ?? '';

    this.#setTriggerMetadata({ hint, disabled, availability });
  }

  #clearMenuMetadata(): void {
    this.#setTriggerMetadata?.({ hint: '', disabled: false });
    this.#metadataMenu = null;
    this.#setTriggerMetadata = null;
  }
}
