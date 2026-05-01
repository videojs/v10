import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuContext } from './context';

export class MenuItemElement extends MediaElement {
  static readonly tagName = 'media-menu-item';

  static override properties = {
    disabled: { type: Boolean },
    commandfor: { type: String },
  } satisfies PropertyDeclarationMap<'disabled' | 'commandfor'>;

  disabled = false;
  /** ID of a nested `<media-menu>` to open when this item is activated. */
  commandfor: string | undefined = undefined;

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
            const target = this.commandfor;
            if (target) {
              // Push the linked submenu — use this element's id as triggerId
              // (ensure the element has an id for focus restoration).
              ctx.menu.push(target, this.id);
            } else {
              this.dispatchEvent(new CustomEvent('select', { bubbles: true }));
              ctx.menu.close();
            }
            event.preventDefault();
          },
          onPointerenter: () => {
            if (!this.disabled) ctx.menu.highlight(this);
          },
        },
        { signal: this.#disconnect.signal }
      );
    }

    const hasSubmenu = Boolean(this.commandfor);
    const topEntry = ctx.navigation.stack[ctx.navigation.stack.length - 1];
    const activeSubMenuId = topEntry?.menuId ?? null;
    const isExpanded = hasSubmenu ? activeSubMenuId === this.commandfor : undefined;

    applyElementProps(this, {
      role: 'menuitem',
      'aria-disabled': this.disabled ? 'true' : undefined,
      ...(hasSubmenu && {
        'aria-haspopup': 'menu',
        'aria-expanded': isExpanded ? 'true' : 'false',
        'data-has-submenu': '',
      }),
    });

    applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
