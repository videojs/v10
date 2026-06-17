import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuItemSettingContext } from './context';

export class MenuItemValueElement extends MediaElement {
  static readonly tagName = 'media-menu-item-value';

  readonly #ctx = new ContextConsumer(this, { context: menuItemSettingContext, subscribe: true });

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-live', 'off');
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    this.textContent = this.#ctx.value?.label ?? '';
  }
}
