import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuGroupContext } from './context';

let idCounter = 0;

export class MenuGroupLabelElement extends MediaElement {
  static readonly tagName = 'media-menu-group-label';

  readonly #groupCtx = new ContextConsumer(this, { context: menuGroupContext, subscribe: true });
  readonly #generatedId = `vjs-menu-group-label-${idCounter++}`;

  #cleanupRegistration: (() => void) | null = null;
  #registeredId: string | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupRegistration?.();
    this.#cleanupRegistration = null;
    this.#registeredId = null;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    if (!this.id) {
      this.id = this.#generatedId;
    }

    this.#registerLabel();
  }

  #registerLabel(): void {
    const groupCtx = this.#groupCtx.value;

    if (!groupCtx) {
      this.#cleanupRegistration?.();
      this.#cleanupRegistration = null;
      this.#registeredId = null;
      return;
    }

    if (this.#registeredId === this.id) return;

    this.#cleanupRegistration?.();
    this.#registeredId = this.id;
    this.#cleanupRegistration = groupCtx.registerLabel(this.id);
  }
}
