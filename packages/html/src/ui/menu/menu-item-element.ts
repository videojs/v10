import { applyElementProps, completeMenuItemSelection } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { type MenuContextValue, menuContext } from './context';

export class MenuItemElement extends MediaElement {
  static readonly tagName = 'media-menu-item';

  static override properties = {
    disabled: { type: Boolean },
    commandfor: { type: String },
  } satisfies PropertyDeclarationMap<'disabled' | 'commandfor'>;

  disabled = false;
  /** Optional command target interpreted by an explicitly imported integration. */
  commandfor: string | undefined = undefined;

  readonly #ctx = new ContextConsumer(this, { context: menuContext, subscribe: true });
  #disconnect: AbortController | null = null;
  #registeredMenu: MenuContextValue['menu'] | null = null;
  #cleanupRegistration: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupRegistration?.();
    this.#cleanupRegistration = null;
    this.#registeredMenu = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const ctx = this.#ctx.value;
    if (!ctx || !this.#disconnect) return;

    if (this.#registeredMenu !== ctx.menu) {
      this.#cleanupRegistration?.();
      this.#registeredMenu = ctx.menu;
      this.#cleanupRegistration = ctx.menu.registerItem(this);

      applyElementProps(
        this,
        {
          onClick: (event: MouseEvent) => {
            const currentCtx = this.#ctx.value;
            if (!currentCtx || this.#isDisabled()) return;

            const select = new CustomEvent('select', { bubbles: true, cancelable: true });
            if (!this.dispatchEvent(select)) {
              event.preventDefault();
              return;
            }

            completeMenuItemSelection(currentCtx.menu);
            event.preventDefault();
          },
          onPointerenter: () => {
            const currentCtx = this.#ctx.value;
            if (!this.#isDisabled()) currentCtx?.menu.highlight(this, { focus: false });
          },
        },
        { signal: this.#disconnect.signal }
      );
    }

    applyElementProps(this, {
      role: 'menuitem',
      'aria-disabled': this.#isDisabled() ? 'true' : undefined,
    });
  }

  #isDisabled(): boolean {
    return this.disabled || this.getAttribute('aria-disabled') === 'true';
  }
}
