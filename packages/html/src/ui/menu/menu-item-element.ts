import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuContext } from './context';

export class MenuItemElement extends MediaElement {
  static readonly tagName = 'media-menu-item';

  static override properties = {
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<'disabled'>;

  disabled = false;

  readonly #ctx = new ContextConsumer(this, { context: menuContext, subscribe: true });

  #disconnect: AbortController | null = null;
  #registered = false;
  #cleanupRegistration: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
    this.#registered = false;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupRegistration?.();
    this.#cleanupRegistration = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#registered = false;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#ctx.value;
    if (!ctx || !this.#disconnect) return;

    if (!this.#registered) {
      this.#registered = true;

      this.#cleanupRegistration = ctx.menu.registerItem(this);

      applyElementProps(
        this,
        {
          onClick: (event: MouseEvent) => {
            if (this.disabled) return;
            this.dispatchEvent(new CustomEvent('select', { bubbles: true }));
            ctx.menu.close();
            event.preventDefault();
          },
          onPointerenter: () => {
            if (!this.disabled) ctx.menu.highlight(this);
          },
        },
        { signal: this.#disconnect.signal }
      );
    }

    applyElementProps(this, {
      role: 'menuitem',
      'aria-disabled': this.disabled ? 'true' : undefined,
    });

    applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
